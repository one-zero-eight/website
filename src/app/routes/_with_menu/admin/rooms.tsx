import { AdminRoomsPage } from "@/components/admin/AdminRoomsPage.tsx";
import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/admin/rooms")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    return {
      code: search.code ? search.code.toString() : undefined,
    };
  },
});

function RouteComponent() {
  const { code } = Route.useSearch();

  return (
    <>
      <Helmet>
        <title>Admin rooms</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Admin" />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminRoomsPage initialCode={code} />
      </RequireInnohassleAdmin>
    </>
  );
}
