import { BoardGamesAdminPage } from "@/components/board-games/BoardGamesAdminPage.tsx";
import { BoardGamesTabs } from "@/components/board-games/BoardGamesTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";
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
      <Topbar title={<Trans>Board Games</Trans>} />
      <BoardGamesTabs />
      <RequireAuth>
        <BoardGamesAdminPage />
      </RequireAuth>
    </>
  );
}
