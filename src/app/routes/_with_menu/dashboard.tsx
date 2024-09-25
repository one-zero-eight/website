import { DashboardPage } from "@/components/dashboard/DashboardPage.tsx";
import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/dashboard")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Dashboard</title>
        <meta
          name="description"
          content="Sign in and see your schedule at Innopolis University."
        />
      </Helmet>

      <NavbarTemplate
        title="Dashboard"
        description="Your cozy space on this planet."
      />
      <DashboardPage />
    </div>
  ),
});
