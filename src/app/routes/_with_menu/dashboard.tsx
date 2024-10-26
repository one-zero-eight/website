import { DashboardPage } from "@/components/dashboard/DashboardPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/dashboard")({
  component: () => (
    <div className="flex min-h-full flex-col overflow-y-auto @container/content">
      <Helmet>
        <title>Dashboard</title>
        <meta
          name="description"
          content="Sign in and see your schedule at Innopolis University."
        />
      </Helmet>

      <Topbar title="Dashboard" />
      <DashboardPage />
    </div>
  ),
});
