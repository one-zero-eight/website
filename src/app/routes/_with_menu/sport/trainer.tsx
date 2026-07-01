import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/trainer")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Sport trainer</title>
        <meta
          name="description"
          content="Trainer tools for sport groups at Innopolis University."
        />
      </Helmet>

      <Topbar title="Sport" />
      <SportPage activeTab="trainer" />
    </>
  );
}
