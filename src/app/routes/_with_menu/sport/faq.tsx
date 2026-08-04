import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportFaqPage } from "@/components/sport/SportFaqPage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
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

      <Topbar title="Sport" hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportFaqPage />
      </RequireAuth>
    </>
  );
}
