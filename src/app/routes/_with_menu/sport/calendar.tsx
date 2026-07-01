import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Sport personal calendar</title>
        <meta
          name="description"
          content="View sport trainings you are signed up for."
        />
      </Helmet>

      <Topbar title="Sport" />
      <SportPage activeTab="calendar" />
    </>
  );
}
