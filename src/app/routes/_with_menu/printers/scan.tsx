import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScanPage } from "@/components/web-print/ScanPage.tsx";
import { WebPrintTabs } from "@/components/web-print/WebPrintTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/printers/scan")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Scan — Inno Web Print</title>
        <meta
          name="description"
          content="Scan documents on Innopolis University scanners from your browser."
        />
      </Helmet>

      <Topbar title="Inno Web Print" />
      <WebPrintTabs />
      <RequireAuth>
        <ScanPage />
      </RequireAuth>
    </>
  );
}
