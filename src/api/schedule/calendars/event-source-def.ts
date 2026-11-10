// Based on https://github.com/fullcalendar/fullcalendar/blob/v7.1.3/packages/icalendar/src/event-source-def.ts

import type { CalendarSource } from "@/api/schedule/calendars/personal-calendar-urls.ts";
import type { EventInput } from "@fullcalendar/core";
import { addDays } from "@fullcalendar/core/internal";
import ICAL from "ical.js";
import { colorForSubject } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { IcalExpander } from "./IcalExpander.ts";

export function expandICalEvents(
  iCalExpander: IcalExpander,
  start: Date | undefined,
  end: Date | undefined,
  meta: CalendarSource,
): EventInput[] {
  // expand the range. because our `range` is timeZone-agnostic UTC
  // or maybe because ical.js always produces dates in local time? i forget
  const rangeStart = start ? addDays(start, -1) : undefined;
  const rangeEnd = end ? addDays(end, 1) : undefined;

  const iCalRes = iCalExpander.between(rangeStart, rangeEnd); // end inclusive. will give extra results
  const expanded: EventInput[] = [];

  // TODO: instead of using startDate/endDate.toString to communicate allDay,
  // we can query startDate/endDate.isDate. More efficient to avoid formatting/reparsing.

  // single events
  for (const iCalEvent of iCalRes.events) {
    if (meta.excludeEnglish && isEnglishEvent(iCalEvent)) continue;
    expanded.push({
      ...buildNonDateProps(iCalEvent, meta, iCalExpander),
      start: iCalEvent.startDate.toString(),
      end:
        specifiesEnd(iCalEvent) && iCalEvent.endDate
          ? iCalEvent.endDate.toString()
          : undefined,
    });
  }

  // recurring event instances
  for (const iCalOccurence of iCalRes.occurrences) {
    const iCalEvent = iCalOccurence.item;
    if (meta.excludeEnglish && isEnglishEvent(iCalEvent)) continue;
    expanded.push({
      ...buildNonDateProps(iCalEvent, meta, iCalExpander),
      start: iCalOccurence.startDate.toString(),
      end:
        specifiesEnd(iCalEvent) && iCalOccurence.endDate
          ? iCalOccurence.endDate.toString()
          : undefined,
    });
  }

  return expanded;
}

function isEnglishEvent(iCalEvent: ICAL.Event) {
  const summary = String(iCalEvent.summary || "")
    .trim()
    .toLowerCase();
  return ["english", "foreign language", "иностранный язык"].some((name) =>
    summary.includes(name),
  );
}

function buildNonDateProps(
  iCalEvent: ICAL.Event,
  meta: CalendarSource,
  iCalExpander: IcalExpander,
): EventInput {
  const scheduleAssistantColors = meta.eventGroup?.virtual
    ? colorForSubject(courseNameFromSummary(iCalEvent.summary))
    : null;
  return {
    id: iCalEvent.uid,
    title: iCalEvent.summary,
    url: extractEventUrl(iCalEvent),
    backgroundColor:
      iCalEvent.color || scheduleAssistantColors?.bg || meta.color,
    borderColor:
      iCalEvent.color || scheduleAssistantColors?.border || meta.color,
    extendedProps: {
      location: iCalEvent.location,
      organizer: iCalEvent.organizer,
      description: iCalEvent.description,
      calendarURLs: [meta.url],
      sourceLink:
        iCalEvent.component.getFirstProperty("x-wr-link")?.getFirstValue() ||
        iCalExpander.component.getFirstProperty("x-wr-link")?.getFirstValue() ||
        meta.sourceLink,
      updatedAt: meta.eventGroup?.updated_at || meta.updatedAt,
      eventGroup: meta.eventGroup,
    },
  };
}

function courseNameFromSummary(summary: string) {
  return String(summary || "").replace(/\s+\([^()]+\)\s*$/, "");
}

function extractEventUrl(iCalEvent: ICAL.Event): string {
  const urlProp = iCalEvent.component.getFirstProperty("url");
  return urlProp ? (urlProp.getFirstValue() as string) : "";
}

function specifiesEnd(iCalEvent: ICAL.Event) {
  return (
    Boolean(iCalEvent.component.getFirstProperty("dtend")) ||
    Boolean(iCalEvent.component.getFirstProperty("duration"))
  );
}
