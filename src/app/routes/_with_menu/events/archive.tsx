import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventsArchivePage } from "@/components/events/EventsArchivePage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/archive")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events - Archive</title>
        <meta name="description" content="View past events." />
      </Helmet>

      <Topbar title="University Events" hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <EventsArchivePage />
      </RequireAuth>
    </>
  );
}
