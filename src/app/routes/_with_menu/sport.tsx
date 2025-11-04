import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/sport")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Sport bot</title>
        <meta
          name="description"
          content="Convenient sport bot for Innopolis University students."
        />
      </Helmet>

      <Topbar title="Sport" />
      <SportPage />
    </>
  );
}
