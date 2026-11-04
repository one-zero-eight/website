import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportFaqPage } from "@/components/sport/SportFaqPage.tsx";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/sport/faq")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Sport FAQ`}</title>
        <meta
          name="description"
          content={t`Frequently asked questions about sport at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Sport</Trans>} hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportPageShell>
          <SportFaqPage />
        </SportPageShell>
      </RequireAuth>
    </>
  );
}
