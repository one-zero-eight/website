import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/account")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <NavbarTemplate
        title="My account"
        description="Manage your InNoHassle Account and services."
      />
      <Outlet />
    </div>
  ),
});
