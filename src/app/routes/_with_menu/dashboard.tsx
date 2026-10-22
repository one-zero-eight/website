import { DashboardPage } from "@/components/dashboard/DashboardPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Dashboard`}</title>
        <meta
          name="description"
          content={t`Sign in and see your schedule at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Dashboard</Trans>} hideOnMobile />
      <DashboardPage />
    </>
  );
}
