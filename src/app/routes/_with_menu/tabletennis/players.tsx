import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { TabletennisPlayersTop } from "@/components/tabletennis/TabletennisPlayersTop";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/tabletennis/players")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Table tennis`}</title>
        <meta name="description" content={t`Table tennis site`} />
      </Helmet>

      <Topbar title={<Trans>Table tennis club</Trans>} />
      <TabletennisTabs />
      <TabletennisPlayersTop />
    </>
  );
}
