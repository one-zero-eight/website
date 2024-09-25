import { ExtensionPage } from "@/components/extension/ExtensionPage.tsx";
import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/extension")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Browser extension</title>
        <meta
          name="description"
          content="Convenient tools for Moodle, InNoHassle and other services at Innopolis University."
        />
      </Helmet>

      <NavbarTemplate
        title="Browser extension"
        description="Convenient tools for Moodle, InNoHassle and other services at Innopolis University."
      />
      <ExtensionPage />
    </div>
  ),
});
