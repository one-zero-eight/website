import { Topbar } from "@/components/layout/Topbar.tsx";
import { EventPage } from "@/components/events/event/EventPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/events/p/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Events</title>
        <meta name="description" content="University event details." />
      </Helmet>

      <Topbar title="Events" hideOnMobile={true} />
      <EventsTabs />
      <EventPage id={id} />
    </>
  );
}
