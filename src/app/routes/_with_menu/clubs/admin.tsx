import { ClubsTabs } from "@/components/clubs/ClubsTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/clubs/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Clubs</title>
        <meta name="description" content="List of Innopolis student clubs." />
      </Helmet>

      <Topbar title="Clubs" />
      <ClubsTabs />
    </>
  );
}
