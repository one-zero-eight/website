import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";
import { SportProfilePage } from "@/components/sport/SportProfilePage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/sport/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Sport profile`}</title>
        <meta
          name="description"
          content={t`View your sport profile and submit medical references.`}
        />
      </Helmet>

      <Topbar title={<Trans>Sport</Trans>} hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportPageShell>
          <SportProfilePage />
        </SportPageShell>
      </RequireAuth>
    </>
  );
}
