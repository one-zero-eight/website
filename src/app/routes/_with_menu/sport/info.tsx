import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportInfoPage } from "@/components/sport/SportInfoPage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/sport/info")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Sport info`}</title>
        <meta
          name="description"
          content={t`Sport information at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Sport</Trans>} hideOnMobile />
      <SportTabs />
      <SportInfoPage />
    </>
  );
}
