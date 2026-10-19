import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SubmissionsPage } from "@/components/events/submissions/SubmissionsPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/events/submissions/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="Review event submissions." />
      </Helmet>

      <Topbar title={<Trans>Events</Trans>} hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <SubmissionsPage />
      </RequireAuth>
    </>
  );
}
