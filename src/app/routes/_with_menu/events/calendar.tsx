import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventsCalendarPage } from "@/components/events/EventsCalendarPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events - Calendar</title>
        <meta
          name="description"
          content="View university events on a calendar."
        />
      </Helmet>

      <Topbar title="University Events" hideOnMobile={true} />
      <EventsTabs />
      <EventsCalendarPage />
    </>
  );
}
