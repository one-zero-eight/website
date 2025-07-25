import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportClubPage } from "@/components/sport/SportClubPage";

export const Route = createFileRoute("/_with_menu/sport/club/$clubId")({
  component: () => (
    <>
      <Helmet>
        <title>Club — Sport</title>
        <meta
          name="description"
          content="Sport club details and information."
        />
      </Helmet>
      <SportClubPage />
    </>
  ),
});
