import { GuardPage } from "@/components/guard/GuardPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/guard")({
  component: function GuardRoute() {
    return (
      <>
        <Helmet>
          <title>Guard</title>
        </Helmet>

        <Topbar title="Guard" />
        <GuardPage />
      </>
    );
  },
});
