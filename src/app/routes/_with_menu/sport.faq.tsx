import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/faq")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Sport FAQ</title>
        <meta
          name="description"
          content="Frequently asked questions about sport at Innopolis University."
        />
      </Helmet>

      <Topbar title="Sport" />
      <SportPage activeTab="faq" />
    </>
  );
}
