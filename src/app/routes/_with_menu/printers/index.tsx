import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { WebPrintLandingPage } from "@/components/web-print/WebPrintLandingPage.tsx";
import { WebPrintTabs } from "@/components/web-print/WebPrintTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/printers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Inno Web Print</title>
        <meta
          name="description"
          content="Quickly print & scan your documents on Innopolis University printers right from your browser."
        />
      </Helmet>

      <Topbar title="Inno Web Print" />
      <WebPrintTabs />
      <RequireAuth>
        <WebPrintLandingPage />
      </RequireAuth>
    </>
  );
}
