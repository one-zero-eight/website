import { addDays } from "@fullcalendar/core/internal";
import { IcalExpander } from "@/components/calendar/iCalendarPlugin/ical-expander/IcalExpander";
import { slotKeyToDateRange } from "./api-slots.ts";
import { getSlotKey } from "./slots.ts";

export type PersonalCalendarEvent = {
  title: string;
  start: Date;
  end: Date;
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

function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function getMeetingCalendarRange(dateIds: string[]) {
  if (dateIds.length === 0) {
    return null;
  }

  const sortedDateIds = [...dateIds].sort();
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
    return [];
  }

  const icsText = await response.text();
  const expander = new IcalExpander({
    ics: icsText,
    skipInvalidDates: true,
  });

  const expandedRangeStart = addDays(rangeStart, -1);
  const expandedRangeEnd = addDays(rangeEnd, 1);
  const expanded = expander.between(expandedRangeStart, expandedRangeEnd);
  const events: PersonalCalendarEvent[] = [];

  for (const event of expanded.events) {
    events.push({
      title: event.summary || "Busy",
      start: event.startDate.toJSDate(),
      end: event.endDate?.toJSDate() ?? event.startDate.toJSDate(),
    });
  }

  for (const occurrence of expanded.occurrences) {
    events.push({
      title: occurrence.item.summary || "Busy",
      start: occurrence.startDate.toJSDate(),
      end: occurrence.endDate?.toJSDate() ?? occurrence.startDate.toJSDate(),
    });
  }

  return events.filter((event) =>
    intervalsOverlap(event.start, event.end, rangeStart, rangeEnd),
  );
}

export async function fetchPersonalCalendarEvents(
  urls: string[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  const results = await Promise.all(
    urls.map((url) => fetchEventsFromIcsUrl(url, rangeStart, rangeEnd)),
  );

  return results.flat();
}

export function buildCalendarSlotOverlay(
  events: PersonalCalendarEvent[],
  dateIds: string[],
  timeSlots: string[],
  allowedSlots?: Set<string>,
) {
  const slotEvents = new Map<string, string[]>();

  for (const dateId of dateIds) {
    for (const time of timeSlots) {
      const slotKey = getSlotKey(dateId, time);

      if (allowedSlots && !allowedSlots.has(slotKey)) {
        continue;
      }

      const { start, end } = slotKeyToDateRange(slotKey);
      const titles: string[] = [];

      for (const event of events) {
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
