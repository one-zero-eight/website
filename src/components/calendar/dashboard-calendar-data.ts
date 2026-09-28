import type { when2meetTypes } from "@/api/when2meet";
import ICAL from "ical.js";
import { IcalExpander } from "./iCalendarPlugin/ical-expander/IcalExpander.js";

export type DashboardCalendarActivity = {
  id: string;
  /** Original ICS UID, used to merge the same event across selected feeds. */
  uid?: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
};

export type CalendarDataError = { sourceId: string; error: unknown };

const MAX_FEED_RECURRENCE_ITERATIONS = 10_000;

type ExpandedOccurrence = {
  item: ICAL.Event;
  startDate: ICAL.Time;
  endDate: ICAL.Time;
};
type ExpandedCalendar = {
  events: ICAL.Event[];
  occurrences: ExpandedOccurrence[];
};

export function getLocalCalendarDay(nowMs: number) {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function activitiesInCalendarDay(
  activities: DashboardCalendarActivity[],
  nowMs: number,
) {
  const { start, end } = getLocalCalendarDay(nowMs);
  return activities.filter(
    (activity) => activity.start < end && activity.end > start,
  );
}

/** Match the full calendar's UID/start/end deduplication across ICS sources. */
export function deduplicateCalendarActivities(
  activities: DashboardCalendarActivity[],
) {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    if (!activity.uid) return true;
    const key = JSON.stringify([
      activity.uid,
      activity.start.getTime(),
      activity.end.getTime(),
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCancelled(event: ICAL.Event) {
  return (
    String(
      event.component.getFirstPropertyValue("status") ?? "",
    ).toUpperCase() === "CANCELLED"
  );
}

/**
 * Expand only the requested local day. UTC, floating dates and VTIMEZONE use
 * ical.js's native JS-Date conversion; date-only values stay local midnight.
 * End dates are exclusive, including all-day and overnight events.
 */
export function normalizeDashboardIcs(
  ics: string,
  sourceId: string,
  nowMs: number,
): DashboardCalendarActivity[] {
  const expander = new IcalExpander({ ics, maxIterations: 0 });
  if (expander.component.name !== "vcalendar")
    throw new Error("Expected an iCalendar document");
  // ICAL.Event otherwise auto-relates every sibling exception, even when its
  // UID belongs to another series. Manual exception handling below owns this.
  const events: ICAL.Event[] = expander.events.map(
    (event: ICAL.Event) => new ICAL.Event(event.component, { exceptions: [] }),
  );
  const exceptions = events.filter((event) => event.isRecurrenceException());
  const masters = events.filter((event) => !event.isRecurrenceException());
  const mastersByUid = new Map(masters.map((event) => [event.uid, event]));

  // The existing expander substitutes exceptions only when the ORIGINAL start
  // overlaps the range. Exclude their original instances, then add replacements
  // separately so instances moved into/out of today (and cancellation-only
  // exceptions without DTSTART) work as well.
  for (const master of masters) {
    const excludedDates = master.component
      .getAllProperties("exdate")
      .flatMap((property) => property.getValues());
    master.component.removeAllProperties("exdate");
    for (const date of excludedDates)
      master.component.addPropertyWithValue("exdate", date);
    for (const exception of exceptions) {
      if (exception.uid === master.uid)
        master.component.addPropertyWithValue("exdate", exception.recurrenceId);
    }
  }
  expander.events = masters.filter((event) => !isCancelled(event));
  let remainingIterations = MAX_FEED_RECURRENCE_ITERATIONS;
  for (const master of expander.events) {
    const createIterator = master.iterator.bind(master);
    master.iterator = (...args: Parameters<typeof master.iterator>) => {
      const iterator = createIterator(...args);
      const next = iterator.next.bind(iterator);
      iterator.next = () => {
        // Bound work across the entire feed, not separately for each series.
        // The expander's own limit silently truncates; throw instead so the
        // query reports this source as failed rather than falsely empty.
        if (remainingIterations-- <= 0) {
          throw new Error(
            `Calendar ${sourceId} exceeds the ${MAX_FEED_RECURRENCE_ITERATIONS}-iteration recurrence limit`,
          );
        }
        return next();
      };
      return iterator;
    };
  }
  const { start, end } = getLocalCalendarDay(nowMs);
  const expandedStart = new Date(start);
  expandedStart.setDate(expandedStart.getDate() - 1);
  const expanded = expander.between(expandedStart, end) as ExpandedCalendar;
  const instances: ExpandedOccurrence[] = [
    ...expanded.events.map((item) => ({
      item,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    ...expanded.occurrences,
    ...exceptions
      .filter((item) => !isCancelled(item) && !isCancelledMaster(item))
      .map((item) => ({
        item,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
  ];

  function isCancelledMaster(event: ICAL.Event) {
    const master = mastersByUid.get(event.uid);
    return master ? isCancelled(master) : false;
  }

  const activities = instances.map(({ item, startDate, endDate }) => {
    const activityStart = startDate.toJSDate();
    let activityEnd = endDate.toJSDate();
    const master = mastersByUid.get(item.uid);
    if (
      !item.component.hasProperty("dtend") &&
      !item.component.hasProperty("duration")
    ) {
      if (item.isRecurrenceException() && master) {
        const inheritedEnd = startDate.clone();
        inheritedEnd.addDuration(master.duration);
        activityEnd = inheritedEnd.toJSDate();
      }
      if (activityEnd <= activityStart) {
        // Match the full calendar's default duration for events without an end.
        activityEnd = new Date(activityStart);
        if (startDate.isDate) activityEnd.setDate(activityEnd.getDate() + 1);
        else activityEnd.setHours(activityEnd.getHours() + 1);
      }
    }
    if (
      !Number.isFinite(activityStart.getTime()) ||
      !Number.isFinite(activityEnd.getTime())
    ) {
      throw new Error(`Invalid event dates in ${sourceId}`);
    }
    return {
      id: `${sourceId}:${item.uid}:${(item.recurrenceId ?? startDate).toString()}`,
      uid: item.uid,
      title: item.summary || master?.summary || "Untitled event",
      start: activityStart,
      end: activityEnd,
      location: item.location || master?.location || undefined,
      allDay: startDate.isDate,
    };
  });
  return activitiesInCalendarDay(activities, nowMs);
}

/** Use actual timestamps, not FullCalendar's display-only UTC date adjustment. */
export function normalizeDashboardMeetings(
  meetings: Pick<
    when2meetTypes.SchemaEventView,
    "slug" | "name" | "selected_time"
  >[],
  nowMs: number,
): DashboardCalendarActivity[] {
  return activitiesInCalendarDay(
    meetings.flatMap((meeting) => {
      if (!meeting.selected_time) return [];
      return [
        {
          id: `when2meet:${meeting.slug}`,
          title: meeting.name,
          start: new Date(meeting.selected_time.start),
          end: new Date(meeting.selected_time.end),
        },
      ];
    }),
    nowMs,
  );
}
