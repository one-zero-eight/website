import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportFitnessTestPage } from "@/components/sport/SportFitnessTestPage";

export const Route = createFileRoute("/_with_menu/sport/fitness-test")({
  component: () => (
    <>
      <Helmet>
        <title>Fitness Test — Sport</title>
        <meta
          name="description"
          content="Fitness testing and evaluation."
        />
      </Helmet>
      <SportFitnessTestPage />
    </>
  ),
}); 