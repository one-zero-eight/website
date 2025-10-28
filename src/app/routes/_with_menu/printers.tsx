import { Topbar } from "@/components/layout/Topbar.tsx";
import { PrintersPage } from "@/components/printers/PrintersPage";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/printers")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Inno Print Bot</title>
        <meta
          name="description"
          content="Quickly print & scan your documents on Innopolis University printers."
        />
      </Helmet>

      <Topbar title="Inno Print Bot" />
      <PrintersPage />
    </>
  );
}
