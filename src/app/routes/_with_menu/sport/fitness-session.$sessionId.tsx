import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportFitnessSessionPage } from "@/components/sport/SportFitnessSessionPage";

export const Route = createFileRoute(
  "/_with_menu/sport/fitness-session/$sessionId",
)({
  component: () => (
    <>
      <Helmet>
        <title>Fitness Session — Sport</title>
        <meta
          name="description"
          content="Fitness session details and results."
        />
      </Helmet>
      <SportFitnessSessionPage />
    </>
  ),
});
