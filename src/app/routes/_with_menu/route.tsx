import Sidebar from "@/components/layout/Sidebar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu")({
  component: () => (
    <div className="flex h-full flex-row">
      <Sidebar>
        <div className="flex min-h-full grow flex-col overflow-y-auto @container/content">
          <Outlet />
        </div>
      </Sidebar>
    </div>
  ),
});
