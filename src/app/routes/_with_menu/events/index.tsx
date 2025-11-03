import { Topbar } from "@/components/layout/Topbar.tsx";
import { ToastContainer, ToastProvider } from "@/components/toast";
import { EventsListPage } from "@/components/events/EventsListPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/events/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="Check in to events here." />
      </Helmet>

      <Topbar title="Events" />
      <EventsTabs />
      <ToastProvider>
        <EventsListPage />
        <ToastContainer />
      </ToastProvider>
    </>
  );
}
