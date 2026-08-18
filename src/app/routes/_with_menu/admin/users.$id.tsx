import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { AdminUserPage } from "@/components/admin/AdminUserPage.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/admin/users/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Admin user</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Admin" />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminUserPage id={id} />
      </RequireInnohassleAdmin>
    </>
  );
}
