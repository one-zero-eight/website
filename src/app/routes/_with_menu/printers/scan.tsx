import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScanPage } from "@/components/web-print/ScanPage.tsx";
import { WebPrintTabs } from "@/components/web-print/WebPrintTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";
import { Trans, useLingui } from "@lingui/react/macro";

export const Route = createFileRoute("/_with_menu/printers/scan")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  return (
    <>
      <Helmet>
        <title>{t`Scan — Printers`}</title>
        <meta
          name="description"
          content={t`Scan documents on Innopolis University scanners from your browser.`}
        />
      </Helmet>

      <Topbar title={<Trans>Printers</Trans>} />
      <WebPrintTabs />
      <RequireAuth>
        <ScanPage />
      </RequireAuth>
    </>
  );
}
