import { WorkshopsPageWithToast } from "@/components/workshops/WorkshopsPageWithToast.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/workshops")({
  component: () => (
    <>
      <Helmet>
        <title>Workshops</title>
        <meta
          name="description"
          content="Sign in for bootcamp workshops here."
        />
      </Helmet>

      <Topbar title="Workshops" />
      <WorkshopsPageWithToast />
    </>
  ),
});
