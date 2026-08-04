import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportSchedulePage } from "@/components/sport/SportSchedulePage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/sport/")({
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

      <Topbar title="Sport" hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportSchedulePage />
      </RequireAuth>
    </>
  );
}
