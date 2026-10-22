import { AdminAcademicCalendarsPage } from "@/components/admin/AdminAcademicCalendarsPage.tsx";
import { AdminTabs } from "@/components/admin/AdminTabs.tsx";
import { RequireInnohassleAdmin } from "@/components/admin/RequireInnohassleAdmin.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/admin/academic-calendars")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Academic calendars`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title={<Trans>Admin</Trans>} />
      <RequireInnohassleAdmin>
        <AdminTabs />
        <AdminAcademicCalendarsPage />
      </RequireInnohassleAdmin>
    </>
  );
}
