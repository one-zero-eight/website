import { MaxSourcesPage } from "@/components/search/admin/MaxSourcesPage";
import { CatixAdminTabs } from "@/components/search/admin/CatixAdminTabs";
import { RequireCatixAdmin } from "@/components/search/admin/RequireCatixAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/search/admin/max/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();

  return (
    <>
      <Helmet>
        <title>{t`cAtIx admin: MAX`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title={<Trans>cAtIx admin</Trans>} />
      <RequireCatixAdmin>
        <CatixAdminTabs />
        <MaxSourcesPage />
      </RequireCatixAdmin>
    </>
  );
}
