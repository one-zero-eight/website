import type { when2meetTypes } from "@/api/when2meet";
import type { EventInput } from "@fullcalendar/core";
import { slotKeyToDateRange } from "@/components/when2meet/utils/api-slots.ts";
import { getBestMeetingSlotKey } from "@/components/when2meet/utils/best-slot.ts";

const WHEN2MEET_EVENT_ID_PREFIX = "when2meet-";
const WHEN2MEET_EVENT_COLOR = "rgb(151 71 255)";

export function getWhen2MeetCalendarEventId(slug: string) {
  return `${WHEN2MEET_EVENT_ID_PREFIX}${slug}`;
}

export function when2MeetEventToCalendarEvent(
  event: when2meetTypes.SchemaEventView,
): EventInput | null {
  const bestSlotKey = getBestMeetingSlotKey(event);

  if (!bestSlotKey) {
    return null;
  }

  const { start, end } = slotKeyToDateRange(bestSlotKey);

  return {
    id: getWhen2MeetCalendarEventId(event.slug),
    title: event.name,
    start: start.toISOString(),
    end: end.toISOString(),
    color: WHEN2MEET_EVENT_COLOR,
    extendedProps: {
      description: event.description,
      sourceLink: `/when2meet/${event.slug}`,
    },
  };
}

export function when2MeetEventsToCalendarEvents(
  events: when2meetTypes.SchemaEventView[],
) {
  return events.flatMap((event) => {
    const calendarEvent = when2MeetEventToCalendarEvent(event);

    return calendarEvent ? [calendarEvent] : [];
  });
}

export { WHEN2MEET_EVENT_ID_PREFIX };
