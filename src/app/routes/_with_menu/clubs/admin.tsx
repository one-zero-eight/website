import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { ClubsAdminPage } from "@/components/clubs/ClubsAdminPage";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/clubs/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Manage clubs`}</title>
        <meta name="description" content={t`Manage a list of student clubs.`} />
      </Helmet>

      <Topbar title={<Trans>Student Clubs</Trans>} />
      <ClubsTabs />
      <RequireAuth>
        <ClubsAdminPage />
      </RequireAuth>
    </>
  );
}
