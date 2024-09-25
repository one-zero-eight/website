import { NavbarTemplate } from "@/components/layout/Navbar.tsx";
import { SportPage } from "@/components/sport/SportPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/sport")({
  component: () => (
    <div className="flex flex-col p-4 @container/content @2xl/main:p-12">
      <Helmet>
        <title>Sport bot</title>
        <meta
          name="description"
          content="Convenient sport bot for Innopolis University students."
        />
      </Helmet>

      <NavbarTemplate
        title="Sport"
        description="Check in for sports in the new Sport bot."
      />
      <SportPage />
    </div>
  ),
});
