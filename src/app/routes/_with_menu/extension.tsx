import { ExtensionPage } from "@/components/extension/ExtensionPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/extension")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Browser extension</title>
        <meta
          name="description"
          content="Convenient tools for Moodle, InNoHassle and other services at Innopolis University."
        />
      </Helmet>

      <Topbar title={<Trans>Browser extension</Trans>} />
      <ExtensionPage />
    </>
  );
}
