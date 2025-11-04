import { Topbar } from "@/components/layout/Topbar.tsx";
import { ToastContainer, ToastProvider } from "@/components/toast";
import { EventsAdminPage } from "@/components/events/EventsAdminPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="Check in to events here." />
      </Helmet>

      <Topbar title="Events" hideOnMobile={true} />
      <EventsTabs />
      <ToastProvider>
        <EventsAdminPage />
        <ToastContainer />
      </ToastProvider>
    </>
  );
}
