import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/history")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Sport history</title>
        <meta
          name="description"
          content="View your sport hours history across past semesters."
        />
      </Helmet>

      <Topbar title="Sport" />
      <SportPage activeTab="history" />
    </>
  );
}
