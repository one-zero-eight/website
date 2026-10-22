import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { HowToCreateClubPage } from "@/components/clubs/HowToCreateClubPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/clubs/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Clubs`}</title>
        <meta
          name="description"
          content={t`Have an idea for a club? Start your own community and make a difference at Innopolis University!`}
        />
      </Helmet>

      <Topbar title={<Trans>Student Clubs</Trans>} />
      <ClubsTabs />
      <HowToCreateClubPage />
    </>
  );
}
