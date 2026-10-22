import { useLingui } from "@lingui/react/macro";
import { GuardLandingPage } from "@/components/guard/GuardLandingPage.tsx";
import { GuardTabs } from "@/components/guard/GuardTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_with_menu/guard/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>Guard</title>
        <meta
          name="description"
          content={t`Protect Google Spreadsheets with SSO join links for Innopolis University users.`}
        />
      </Helmet>

      <Topbar title="Guard" />
      <GuardTabs />
      <GuardLandingPage />
    </>
  );
}
