import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { BoardGamesPage } from "@/components/board-games/BoardGamesPage";
import { BoardGamesTabs } from "@/components/board-games/BoardGamesTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/board-games/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Board Games</title>
        <meta
          name="description"
          content="Service for board games reservation."
        />
      </Helmet>

      <Topbar title={<Trans>Board Games</Trans>} />
      <BoardGamesTabs />
      <RequireAuth>
        <BoardGamesPage />
      </RequireAuth>
    </>
  );
}
