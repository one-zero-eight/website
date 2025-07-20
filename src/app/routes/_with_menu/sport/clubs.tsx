import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportClubsPage } from "@/components/sport/SportClubsPage";

export const Route = createFileRoute("/_with_menu/sport/clubs")({
  component: () => (
    <>
      <Helmet>
        <title>Clubs — Sport</title>
        <meta
          name="description"
          content="Sport clubs and activities."
        />
      </Helmet>
      <SportClubsPage />
    </>
  ),
}); 