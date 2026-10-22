import { useLingui } from "@lingui/react/macro";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { FilesPage } from "@/components/guard/FilesPage.tsx";
import { GuardTabs } from "@/components/guard/GuardTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_with_menu/guard/files")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Your sheets — Guard`}</title>
        <meta
          name="description"
          content={t`Manage your Guard-protected spreadsheets, joins, and bans.`}
        />
      </Helmet>

      <Topbar title="Guard" />
      <GuardTabs />
      <RequireAuth>
        <FilesPage />
      </RequireAuth>
    </>
  );
}
