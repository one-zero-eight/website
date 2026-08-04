import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { SportHistoryPage } from "@/components/sport/SportHistoryPage.tsx";
import { SportTabs } from "@/components/sport/SportTabs.tsx";
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

      <Topbar title="Sport" hideOnMobile />
      <SportTabs />
      <RequireAuth>
        <SportHistoryPage />
      </RequireAuth>
    </>
  );
}
