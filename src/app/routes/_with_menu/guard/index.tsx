import { GuardLandingPage } from "@/components/guard/GuardLandingPage.tsx";
import { GuardTabs } from "@/components/guard/GuardTabs.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/guard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Guard</title>
        <meta
          name="description"
          content="Protect Google Spreadsheets with SSO join links for Innopolis University users."
        />
      </Helmet>

      <Topbar title={<Trans>Guard</Trans>} />
      <GuardTabs />
      <GuardLandingPage />
    </>
  );
}
