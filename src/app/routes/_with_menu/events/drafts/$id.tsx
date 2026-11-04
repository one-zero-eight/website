import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { DraftPage } from "@/components/events/drafts/DraftPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/events/drafts/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Events`}</title>
        <meta name="description" content={t`Edit an event draft.`} />
      </Helmet>

      <Topbar title={<Trans>Events</Trans>} hideOnMobile={true} />
      <EventsTabs />
      <RequireAuth>
        <DraftPage id={id} />
      </RequireAuth>
    </>
  );
}
