import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SportFAQPage } from "@/components/sport/SportFAQPage";

export const Route = createFileRoute("/_with_menu/sport/faq")({
  component: () => (
    <>
      <Helmet>
        <title>FAQ — Sport</title>
        <meta
          name="description"
          content="Frequently asked questions about sport activities."
        />
      </Helmet>
      <SportFAQPage />
    </>
  ),
});
