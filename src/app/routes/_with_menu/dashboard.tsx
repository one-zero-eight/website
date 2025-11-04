import { DashboardPage } from "@/components/dashboard/DashboardPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Dashboard</title>
        <meta
          name="description"
          content="Sign in and see your schedule at Innopolis University."
        />
      </Helmet>

      <Topbar title="Dashboard" hideOnMobile />
      <DashboardPage />
    </>
  );
}
