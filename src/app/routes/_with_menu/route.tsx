import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";
import Sidebar from "@/components/layout/Sidebar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex grow overflow-y-hidden">
        <Sidebar />
        <div className="flex min-h-full grow flex-col overflow-y-auto @container/content">
          <Outlet />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
