import { ReservationsAdminPage } from "@/components/board-games/ReservationsAdminPage.tsx";
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
      <ReservationsAdminPage gameId={gameId} />
    </>
  );
}
