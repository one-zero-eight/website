import { DormsPage } from "@/components/dorms/DormsPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/dorms")({
  component: () => (
    <>
      <Helmet>
        <title>Dorms</title>
        <meta
          name="description"
          content="Split duties in your dormitory room."
        />
      </Helmet>

      <Topbar title="Dorms" />
      <DormsPage />
    </>
  ),
});
