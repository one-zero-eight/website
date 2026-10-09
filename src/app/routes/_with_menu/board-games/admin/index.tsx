import { BoardGamesAdminPage } from "@/components/board-games/BoardGamesAdminPage.tsx";
import { BoardGamesTabs } from "@/components/board-games/BoardGamesTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/board-games/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Manage board games</title>
        <meta
          name="description"
          content="Manage board game reservations and storage availability."
        />
      </Helmet>
      <Topbar title="Board Games" />
      <BoardGamesTabs />
      <RequireAuth>
        <BoardGamesAdminPage />
      </RequireAuth>
    </>
  );
}
