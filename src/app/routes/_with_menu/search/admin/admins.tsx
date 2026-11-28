import { CatixAdminsPage } from "@/components/search/admin/CatixAdminsPage";
import { CatixAdminTabs } from "@/components/search/admin/CatixAdminTabs";
import { RequireCatixAdmin } from "@/components/search/admin/RequireCatixAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/search/admin/admins")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();

  return (
    <>
      <Helmet>
        <title>{t`cAtIx admin: admins`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title={<Trans>cAtIx admin</Trans>} />
      <RequireCatixAdmin>
        <CatixAdminTabs />
        <CatixAdminsPage />
      </RequireCatixAdmin>
    </>
  );
}
