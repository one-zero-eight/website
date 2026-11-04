import { ExtensionPage } from "@/components/extension/ExtensionPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/extension")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Browser extension`}</title>
        <meta
          name="description"
          content={t`Convenient tools for Moodle, InNoHassle and other services at Innopolis University.`}
        />
      </Helmet>

      <Topbar title={<Trans>Browser extension</Trans>} />
      <ExtensionPage />
    </>
  );
}
