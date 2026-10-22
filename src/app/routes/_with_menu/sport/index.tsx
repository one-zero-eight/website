import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";
import { SportSchedulePage } from "@/components/sport/SportSchedulePage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/sport/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Sport`}</title>
        <meta
          name="description"
          content={t`View sport schedule and check in to sport classes.`}
        />
      </Helmet>

      <Topbar title={<Trans>Sport</Trans>} hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportPageShell>
          <SportSchedulePage />
        </SportPageShell>
      </RequireAuth>
    </>
  );
}
