import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportSchedulePage } from "@/components/sport/SportSchedulePage";

export const Route = createFileRoute("/_with_menu/sport/schedule")({
  component: () => (
    <>
      <Helmet>
        <title>Schedule — Sport</title>
        <meta
          name="description"
          content="Sport schedule and booking system."
        />
      </Helmet>
      <SportSchedulePage />
    </>
  ),
}); 