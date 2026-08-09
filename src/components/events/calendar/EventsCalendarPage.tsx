import { Calendar } from "@/components/calendar/Calendar.tsx";
import { getEventsIcsUrl } from "../utils/links";
import { EventsCalendarPopover } from "./EventsCalendarPopover";

export function EventsCalendarPage() {
  return (
    <Calendar
      urls={[
        {
          url: getEventsIcsUrl(),
          sourceLink: "/events",
        },
      ]}
      initialView="listMonth"
      viewId="events"
      EventPopover={EventsCalendarPopover}
    />
  );
}
