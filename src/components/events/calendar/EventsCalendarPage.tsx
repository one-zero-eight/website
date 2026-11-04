import { Calendar } from "@/components/calendar/Calendar.tsx";
import { useLingui } from "@lingui/react/macro";
import { getEventsIcsUrl } from "../utils/links";
import { EventsCalendarPopover } from "./EventsCalendarPopover";
import { EventsCardsView } from "./EventsCardsView";

export function EventsCalendarPage() {
  const { t } = useLingui();
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
          displayName: t`Cards`,
          component: EventsCardsView,
        },
      ]}
      viewStorageId="events"
      EventPopover={EventsCalendarPopover}
    />
  );
}
