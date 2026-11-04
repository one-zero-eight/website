import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { SportTrainerPage } from "@/components/sport/SportTrainerPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/sport/trainer")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Sport trainer`}</title>
        <meta
          name="description"
          content={t`Trainer tools for sport groups at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Sport</Trans>} hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportPageShell>
          <SportTrainerPage />
        </SportPageShell>
      </RequireAuth>
    </>
  );
}
