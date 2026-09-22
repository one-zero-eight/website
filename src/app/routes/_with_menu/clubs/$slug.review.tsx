import { ClubReviewChangeDetailPage } from "@/components/clubs/ClubReviewChangeDetailPage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/clubs/$slug/review")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Review club changes</title>
        <meta
          name="description"
          content="Review a club change proposed by a club leader."
        />
      </Helmet>

      <Topbar title="Student Clubs" />
      <ClubsTabs />
      <RequireAuth>
        <ClubReviewChangeDetailPage slug={slug} />
      </RequireAuth>
    </>
  );
}
