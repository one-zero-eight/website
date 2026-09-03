import { ClubPendingUpdatesPage } from "@/components/clubs/ClubPendingUpdatesPage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/clubs/pending-updates/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Pending club changes</title>
        <meta
          name="description"
          content="Review pending club changes proposed by club leaders."
        />
      </Helmet>

      <Topbar title="Student Clubs" />
      <ClubsTabs />
      <RequireAuth>
        <ClubPendingUpdatesPage />
      </RequireAuth>
    </>
  );
}
