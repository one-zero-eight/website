import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/sport")({
  component: () => (
    <>
      <Helmet>
        <title>Sport</title>
        <meta
          name="description"
          content="Sport management system for Innopolis University students."
        />
      </Helmet>

      <Topbar title="Sport" />
      <Outlet />
    </>
  ),
});
