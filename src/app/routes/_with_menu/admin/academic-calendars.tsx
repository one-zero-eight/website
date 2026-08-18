import { AdminAcademicCalendarsPage } from "@/components/admin/AdminAcademicCalendarsPage.tsx";
import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/admin/academic-calendars")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Academic calendars</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Admin" />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminAcademicCalendarsPage />
      </RequireInnohassleAdmin>
    </>
  );
}
