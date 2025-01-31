import { CalendarPage } from "@/components/calendar/CalendarPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/calendar")({
  component: () => (
    <>
      <Helmet>
        <title>Personal calendar</title>
        <meta name="description" content="View your personal calendar." />
      </Helmet>

      <Topbar title="Calendar" />
      <CalendarPage />
    </>
  ),
});
