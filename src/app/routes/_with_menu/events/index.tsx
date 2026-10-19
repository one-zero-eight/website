import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventsCalendarPage } from "@/components/events/calendar/EventsCalendarPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

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

      <Topbar title={<Trans>Events</Trans>} hideOnMobile={true} />
      <EventsTabs />
      <EventsCalendarPage />
    </>
  );
}
