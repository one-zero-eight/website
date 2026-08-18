import { AdminPage } from "@/components/admin/AdminPage.tsx";
import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Admin</title>
        <meta name="description" content="InNoHassle admin panel." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Admin" />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminPage />
      </RequireInnohassleAdmin>
    </>
  );
}
