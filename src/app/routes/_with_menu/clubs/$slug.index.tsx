import { ClubPage } from "@/components/clubs/ClubPage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/clubs/$slug/")({
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
      <ClubPage clubSlug={slug} />
    </>
  );
}
