import EventPage from "@/components/events/EventPage/EventPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/toast";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/events/$slug/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return (
    <>
      <Helmet>
        <title>Event {slug}</title>
        <meta name="description" content={`${slug} event in Innopolis!`} />
      </Helmet>
      <Topbar title="Event details" hideOnMobile={true} />
      <EventsTabs />
      <ToastProvider>
        <EventPage eventSlug={slug} />
      </ToastProvider>
    </>
  );
}
