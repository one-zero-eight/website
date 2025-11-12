import EventPage from "@/components/events/EventPage/EventPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { Topbar } from "@/components/layout/Topbar";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/events/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <>
      <Helmet>
        <title>Event details</title>
        <meta name="description" content="Event in Innopolis!" />
      </Helmet>

      <Topbar title="Event details" hideOnMobile={true} />
      <EventsTabs />
      <EventPage eventId={id} />
    </>
  );
}
