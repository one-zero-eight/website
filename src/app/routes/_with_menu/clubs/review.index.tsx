import { ClubReviewChangesPage } from "@/components/clubs/ClubReviewChangesPage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/clubs/review/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Review club changes</title>
        <meta
          name="description"
          content="Review club changes proposed by club leaders."
        />
      </Helmet>

      <Topbar title={<Trans>Student Clubs</Trans>} />
      <ClubsTabs />
      <RequireAuth>
        <ClubReviewChangesPage />
      </RequireAuth>
    </>
  );
}
