import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { TabletennisTabs } from "@/components/tabletennis/TabletennisTabs";
import { Trans } from "@lingui/react/macro";
import {
  type TournamentStage,
  TabletennisTournaments,
} from "@/components/tabletennis/TabletennisTournaments";
import { Topbar } from "@/components/layout/Topbar.tsx";

export const Route = createFileRoute("/_with_menu/tabletennis/tournaments")({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): { tour?: string; stage?: TournamentStage } => {
    return {
      tour: search.tour ? search.tour.toString() : undefined,
      stage: search.stage === "qualification" ? "qualification" : undefined,
    };
  },
});

function RouteComponent() {
  const { tour, stage } = Route.useSearch();

  return (
    <>
      <Helmet>
        <title>Table tennis</title>
        <meta name="description" content="Table tennis site" />
      </Helmet>

      <Topbar title={<Trans>Table tennis club</Trans>} />
      <TabletennisTabs />
      <TabletennisTournaments tourId={tour} stage={stage ?? "validation"} />
    </>
  );
}
