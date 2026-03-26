import { ClubLeaguePage } from "@/components/clubs/ClubLeaguePage.tsx";
import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/clubs/league")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Clubs</title>
        <meta
          name="description"
          content="Compete, grow, and earn rewards for your club's achievements."
        />
      </Helmet>

      <Topbar title="Student Clubs" />
      <ClubsTabs />
      <ClubLeaguePage />
    </>
  );
}
