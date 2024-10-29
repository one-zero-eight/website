import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/account")({
  component: () => (
    <>
      <Topbar title="My account" />
      <Outlet />
    </>
  ),
});
