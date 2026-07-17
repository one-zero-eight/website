import type { when2meetTypes } from "@/api/when2meet";
import type { EventInput } from "@fullcalendar/core";

const WHEN2MEET_EVENT_ID_PREFIX = "when2meet-";
const WHEN2MEET_EVENT_COLOR = "rgb(151 71 255)";

export function getWhen2MeetCalendarEventId(slug: string) {
  return `${WHEN2MEET_EVENT_ID_PREFIX}${slug}`;
}

export function when2MeetEventToCalendarEvent(
  event: when2meetTypes.SchemaEventView,
): EventInput | null {
  if (!event.selected_time) {
    return null;
  }

  return {
    id: getWhen2MeetCalendarEventId(event.slug),
    title: event.name,
    start: event.selected_time.start,
    end: event.selected_time.end,
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
