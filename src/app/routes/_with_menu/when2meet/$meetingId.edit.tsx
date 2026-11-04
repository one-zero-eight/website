import { useLingui } from "@lingui/react/macro";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { CreationPage } from "@/components/when2meet/CreationPage";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_with_menu/when2meet/$meetingId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { meetingId } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Edit meeting | When2Meet`}</title>
        <meta
          name="description"
          content={t`Edit meeting name, dates, times, and availability setup.`}
        />
      </Helmet>

      <Topbar title="When2Meet" hideOnMobile={true} />
      <RequireAuth>
        <CreationPage meetingId={meetingId} />
      </RequireAuth>
    </>
  );
}
