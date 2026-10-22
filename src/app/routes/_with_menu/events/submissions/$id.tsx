import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SubmissionPage } from "@/components/events/submissions/SubmissionPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/events/submissions/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Events`}</title>
        <meta name="description" content={t`Review an event submission.`} />
      </Helmet>

      <Topbar title={<Trans>Events</Trans>} hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <SubmissionPage id={id} />
      </RequireAuth>
    </>
  );
}
