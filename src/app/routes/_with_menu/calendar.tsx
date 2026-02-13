import { CalendarPage } from "@/components/calendar/CalendarPage.tsx";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Personal calendar</title>
        <meta name="description" content="View your personal calendar." />
      </Helmet>

      <Topbar title="Calendar" hideOnMobile hideBorder />
      <RequireAuth>
        <CalendarPage />
      </RequireAuth>
    </>
  );
}
