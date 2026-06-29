import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Topbar } from "@/components/layout/Topbar.tsx";

export const Route = createFileRoute("/_with_menu/tabletennis/matches")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Table tennis</title>
        <meta name="description" content="Table tennis site" />
      </Helmet>

      <Topbar title="Table tennis club" />
      <TabletennisTabs />
    </>
  );
}
