import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { UserSearch } from "@/components/admin/UserSearch.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/admin/users/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    return {
      q: search.q ? search.q.toString() : undefined,
    };
  },
});

function RouteComponent() {
  const { q } = Route.useSearch();

  return (
    <>
      <Helmet>
        <title>Admin users</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Admin" />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          <UserSearch title="Search people" initialQuery={q} />
        </div>
      </RequireInnohassleAdmin>
    </>
  );
}
