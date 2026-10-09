import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { ReservationsAdminPage } from "@/components/board-games/ReservationsAdminPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_with_menu/board-games/admin/reservations",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { gameId?: string } => ({
    gameId: search.gameId ? search.gameId.toString() : undefined,
  }),
});

function RouteComponent() {
  const { gameId } = Route.useSearch();

  return (
    <>
      <Helmet>
        <title>Board game reservations</title>
        <meta
          name="description"
          content="Search and review all board game reservations."
        />
      </Helmet>
      <Topbar title="Board Game Reservations" />
      <RequireAuth>
        <ReservationsAdminPage gameId={gameId} />
      </RequireAuth>
    </>
  );
}
