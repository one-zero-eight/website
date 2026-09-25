import { BoardGamesAdminPage } from "@/components/board-games/BoardGamesAdminPage.tsx";
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
      <BoardGamesAdminPage />
    </>
  );
}
