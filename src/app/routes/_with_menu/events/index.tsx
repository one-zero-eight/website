import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventsCalendarPage } from "@/components/events/calendar/EventsCalendarPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="University events calendar." />
      </Helmet>

      <Topbar title="Events" hideOnMobile={true} />
      <EventsTabs />
      <EventsCalendarPage />
    </>
  );
}
