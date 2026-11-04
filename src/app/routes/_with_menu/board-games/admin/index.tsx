import { useLingui } from "@lingui/react/macro";
import { BoardGamesAdminPage } from "@/components/board-games/BoardGamesAdminPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/board-games/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Manage board games`}</title>
        <meta
          name="description"
          content={t`Manage board game reservations and storage availability.`}
        />
      </Helmet>
      <BoardGamesAdminPage />
    </>
  );
}
