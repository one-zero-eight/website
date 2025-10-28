import { Topbar } from "@/components/layout/Topbar.tsx";
import { ToastContainer, ToastProvider } from "@/components/toast";
import { WorkshopsListPage } from "@/components/workshops/WorkshopsListPage.tsx";
import { WorkshopsTabs } from "@/components/workshops/WorkshopsTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/workshops/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Workshops</title>
        <meta
          name="description"
          content="Check in to bootcamp workshops here."
        />
      </Helmet>

      <Topbar title="Workshops" />
      <WorkshopsTabs />
      <ToastProvider>
        <WorkshopsListPage />
        <ToastContainer />
      </ToastProvider>
    </>
  );
}
