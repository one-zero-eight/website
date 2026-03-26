import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { HowToCreateClubPage } from "@/components/clubs/HowToCreateClubPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/clubs/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Clubs</title>
        <meta
          name="description"
          content="Have an idea for a club? Start your own community and make a difference at Innopolis University!"
        />
      </Helmet>

      <Topbar title="Student Clubs" />
      <ClubsTabs />
      <HowToCreateClubPage />
    </>
  );
}
