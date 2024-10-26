import Sidebar from "@/components/layout/Sidebar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu")({
  component: () => (
    <div className="flex h-full flex-row">
      <Sidebar>
        <div className="flex h-full flex-grow flex-col">
          <Outlet />
        </div>
      </Sidebar>
    </div>
  ),
});
