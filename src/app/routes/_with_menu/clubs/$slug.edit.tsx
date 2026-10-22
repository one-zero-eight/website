import { EditClubPage } from "@/components/clubs/EditClubPage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/clubs/$slug/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { slug } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Clubs`}</title>
        <meta
          name="description"
          content={t`List of Innopolis student clubs.`}
        />
      </Helmet>

      <Topbar title={<Trans>Student Clubs</Trans>} />
      <ClubsTabs />
      <RequireAuth>
        <EditClubPage clubSlug={slug} />
      </RequireAuth>
    </>
  );
}
