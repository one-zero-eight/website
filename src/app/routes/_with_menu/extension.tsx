import { ExtensionPage } from "@/components/extension/ExtensionPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/extension")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Browser extension</title>
        <meta
          name="description"
          content="Convenient tools for Moodle, InNoHassle and other services at Innopolis University."
        />
      </Helmet>

      <Topbar title="Browser extension" />
      <ExtensionPage />
    </>
  );
}
