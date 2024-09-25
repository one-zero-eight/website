import Sidebar from "@/components/layout/Sidebar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu")({
  component: () => (
    <div className="flex flex-row">
      <Sidebar>
        <main className="w-full @container/main">
          <Outlet />
        </main>
      </Sidebar>
    </div>
  ),
});
