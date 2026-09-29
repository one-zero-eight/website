import { addDays } from "@fullcalendar/core/internal";
import { IcalExpander } from "@/components/calendar/iCalendarPlugin/ical-expander/IcalExpander";
import ICAL from "ical.js";
import { getTimeSlotDurationMinutes, slotKeyToDateRange } from "./api-slots.ts";
import { getSlotKey } from "./slots.ts";

export type PersonalCalendarEvent =
  | {
      title: string;
      allDay: false;
      start: Date;
      end: Date;
    }
  | {
      title: string;
      allDay: true;
      startDateId: string;
      endDateIdExclusive: string;
    };

type IcalExpandedResult = {
  events: ICAL.Event[];
  occurrences: {
    item: ICAL.Event;
    startDate: ICAL.Time;
    endDate: ICAL.Time;
  }[];
};

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken || accessToken.length <= 5) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken.slice(1, -1)}`,
  };
}

function getSafeCalendarUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return "unknown calendar source";
  }
}

function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function getNextDateId(dateId: string) {
  const date = new Date(`${dateId}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function createPersonalCalendarEvent(
  title: string,
  startDate: ICAL.Time,
  endDate: ICAL.Time | null,
): PersonalCalendarEvent {
  if (!startDate.isDate) {
    return {
      title,
      allDay: false,
      start: startDate.toJSDate(),
      end: endDate?.toJSDate() ?? startDate.toJSDate(),
    };
  }

  const startDateId = startDate.toString().slice(0, 10);
  const parsedEndDateId = endDate?.toString().slice(0, 10);

  return {
    title,
    allDay: true,
    startDateId,
    endDateIdExclusive:
      parsedEndDateId && parsedEndDateId > startDateId
        ? parsedEndDateId
        : getNextDateId(startDateId),
  };
}

function eventOverlapsRange(
  event: PersonalCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
) {
  if (!event.allDay) {
    return intervalsOverlap(event.start, event.end, rangeStart, rangeEnd);
  }

  const rangeStartDateId = rangeStart.toLocaleDateString("en-CA");
  const rangeEndDateIdExclusive = getNextDateId(
    rangeEnd.toLocaleDateString("en-CA"),
  );

  return (
    event.startDateId < rangeEndDateIdExclusive &&
    event.endDateIdExclusive > rangeStartDateId
  );
}

export function getMeetingCalendarRange(dateIds: string[]) {
  if (dateIds.length === 0) {
    return null;
  }

  const sortedDateIds = [...dateIds].sort((a, b) => a.localeCompare(b));
  const start = new Date(`${sortedDateIds[0]}T00:00:00`);
  const lastDateId = sortedDateIds[sortedDateIds.length - 1];
  const end = new Date(`${lastDateId}T23:59:59`);

  return { start, end };
}

async function fetchEventsFromIcsUrl(
  url: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<PersonalCalendarEvent[]> {
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `Calendar feed "${getSafeCalendarUrl(url)}" responded with HTTP ${response.status}`,
    );
  }

  const icsText = await response.text();
  const expander = new IcalExpander({
    ics: icsText,
    skipInvalidDates: true,
  });

  const expandedRangeStart = addDays(rangeStart, -1);
  const expandedRangeEnd = addDays(rangeEnd, 1);
  const expanded = expander.between(
    expandedRangeStart,
    expandedRangeEnd,
  ) as IcalExpandedResult;
  const events: PersonalCalendarEvent[] = [];

  for (const event of expanded.events) {
    events.push(
      createPersonalCalendarEvent(
        event.summary || "Busy",
        event.startDate,
        event.endDate,
      ),
    );
  }

  for (const occurrence of expanded.occurrences) {
    events.push(
      createPersonalCalendarEvent(
        occurrence.item.summary || "Busy",
        occurrence.startDate,
        occurrence.endDate,
      ),
    );
  }

  return events.filter((event) =>
    eventOverlapsRange(event, rangeStart, rangeEnd),
  );
}

export async function fetchPersonalCalendarEvents(
  urls: string[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  const results = await Promise.allSettled(
    urls.map((url) => fetchEventsFromIcsUrl(url, rangeStart, rangeEnd)),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.warn(
      `Failed to load calendar feed "${getSafeCalendarUrl(urls[index])}"`,
      result.reason,
    );
    return [];
  });
}

export function buildCalendarSlotOverlay(
  events: PersonalCalendarEvent[],
  dateIds: string[],
  timeSlots: string[],
  allowedSlots?: Set<string>,
) {
  const slotEvents = new Map<string, string[]>();
  const durationMinutes = getTimeSlotDurationMinutes(timeSlots);

  for (const dateId of dateIds) {
    for (const time of timeSlots) {
      const slotKey = getSlotKey(dateId, time);

      if (allowedSlots && !allowedSlots.has(slotKey)) {
        continue;
      }

      const { start, end } = slotKeyToDateRange(slotKey, durationMinutes);
      const titles: string[] = [];

      for (const event of events) {
        if (event.allDay) {
          continue;
        }

        if (intervalsOverlap(start, end, event.start, event.end)) {
          titles.push(event.title);
        }
      }

      if (titles.length > 0) {
        slotEvents.set(slotKey, [...new Set(titles)]);
      }
    }
  }

  return slotEvents;
}

export function buildCalendarAllDayOverlay(
  events: PersonalCalendarEvent[],
  dateIds: string[],
) {
  const allDayEvents = new Map<string, string[]>();

  for (const dateId of dateIds) {
    const titles = events
      .filter(
        (event) =>
          event.allDay &&
          event.startDateId <= dateId &&
          event.endDateIdExclusive > dateId,
      )
      .map((event) => event.title);

    if (titles.length > 0) {
      allDayEvents.set(dateId, [...new Set(titles)]);
    }
  }

  return allDayEvents;
}

export function getCalendarConflictSlotKeys(
  selectedSlotKeys: Set<string>,
  calendarSlotEvents: Map<string, string[]>,
) {
  const conflictSlotKeys = new Set<string>();

  for (const slotKey of selectedSlotKeys) {
    if (calendarSlotEvents.has(slotKey)) {
      conflictSlotKeys.add(slotKey);
    }
  }

  return conflictSlotKeys;
}
