import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { AdminUserPage } from "@/components/admin/AdminUserPage.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/admin/users/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>{t`Admin user`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title={<Trans>Admin</Trans>} />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminUserPage id={id} />
      </RequireInnohassleAdmin>
    </>
  );
}
