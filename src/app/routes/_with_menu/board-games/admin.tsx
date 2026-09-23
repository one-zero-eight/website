import {
  BoardGamesTabs,
  RequireBoardGamesAdmin,
} from "@/components/board-games/BoardGamesTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/board-games/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Topbar title="Board Games" />
      <BoardGamesTabs />
      <RequireAuth>
        <RequireBoardGamesAdmin>
          <Outlet />
        </RequireBoardGamesAdmin>
      </RequireAuth>
    </>
  );
}
