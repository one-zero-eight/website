import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportHistoryPage } from "@/components/sport/SportHistoryPage";

export const Route = createFileRoute("/_with_menu/sport/history")({
  component: () => (
    <>
      <Helmet>
        <title>History — Sport</title>
        <meta
          name="description"
          content="Sport activity history."
        />
      </Helmet>
      <SportHistoryPage />
    </>
  ),
}); 