import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { PrintPage } from "@/components/web-print/PrintPage.tsx";
import { WebPrintTabs } from "@/components/web-print/WebPrintTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/printers/print")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Print — Printers</title>
        <meta
          name="description"
          content="Print documents on Innopolis University printers from your browser."
        />
      </Helmet>

      <Topbar title="Printers" />
      <WebPrintTabs />
      <RequireAuth>
        <PrintPage />
      </RequireAuth>
    </>
  );
}
