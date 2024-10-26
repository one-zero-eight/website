import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/account")({
  component: () => (
    <div className="flex min-h-full flex-col overflow-y-auto @container/content">
      <Topbar title="My account" />
      <Outlet />
    </div>
  ),
});
