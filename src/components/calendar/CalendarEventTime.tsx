import type { EventApi } from "@fullcalendar/core";
import { Trans } from "@lingui/react/macro";

export function hasUnknownEnd(event: EventApi) {
  return (
    !event.allDay && (event.extendedProps.endUnknown === true || !event.end)
  );
}

/** Never use FullCalendar's default layout duration as an event's finish. */
export function CalendarEventTime({
  event,
  timeText,
}: {
  event: EventApi;
  timeText: string;
}) {
  return hasUnknownEnd(event) ? (
    <>
      {event.startStr.slice(11, 16)} · <Trans>end time not specified</Trans>
    </>
  ) : (
    <>{timeText}</>
  );
}
