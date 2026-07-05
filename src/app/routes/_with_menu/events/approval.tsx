import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventsApprovalPage } from "@/components/events/EventsApprovalPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/approval")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events - Event approval</title>
        <meta
          name="description"
          content="Approve events before they appear in the public list."
        />
      </Helmet>

      <Topbar title="University Events" hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <EventsApprovalPage />
      </RequireAuth>
    </>
  );
}
