import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/board-games/admin")({
  component: Outlet,
});
