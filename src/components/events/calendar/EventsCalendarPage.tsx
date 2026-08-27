import { Calendar } from "@/components/calendar/Calendar.tsx";
import { getEventsIcsUrl } from "../utils/links";
import { EventsCalendarPopover } from "./EventsCalendarPopover";
import { EventsCardsView } from "./EventsCardsView";

export function EventsCalendarPage() {
  return (
    <Calendar
      urls={[
        {
          url: getEventsIcsUrl(),
          sourceLink: "/events",
        },
      ]}
      initialView="eventsCards"
      views={["dayGridMonth", "timeGridWeek"]}
      customViews={[
        {
          id: "eventsCards",
          displayName: "Cards",
          component: EventsCardsView,
        },
      ]}
      viewId="events"
      EventPopover={EventsCalendarPopover}
    />
  );
}
