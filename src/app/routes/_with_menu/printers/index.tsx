import { Topbar } from "@/components/layout/Topbar.tsx";
import { WebPrintLandingPage } from "@/components/web-print/WebPrintLandingPage.tsx";
import { WebPrintTabs } from "@/components/web-print/WebPrintTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/printers/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Printers`}</title>
        <meta
          name="description"
          content={t`Print and scan documents on Innopolis University printers from your browser or Telegram.`}
        />
      </Helmet>

      <Topbar title={<Trans>Printers</Trans>} />
      <WebPrintTabs />
      <WebPrintLandingPage />
    </>
  );
}
