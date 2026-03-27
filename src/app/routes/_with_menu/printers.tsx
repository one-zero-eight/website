import { Topbar } from "@/components/layout/Topbar.tsx";
import { WebPrintPage } from "@/components/web-print/WebPrintPage";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/printers")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Inno Web Print</title>
        <meta
          name="description"
          content="Quickly print & scan your documents on Innopolis University
          printers right from your browser."
        />
      </Helmet>

      <Topbar title="Inno Web Print" />
      <WebPrintPage />
    </>
  );
}
