import EditPage from "@/components/events/EventEditPage/EditPage";
import { EventsTabs } from "@/components/events/EventsTabs";
import { Topbar } from "@/components/layout/Topbar";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/events/$id/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Event Edit</title>
        <meta name="description" content="Edit event" />
      </Helmet>

      <Topbar title="Event Edit" hideOnMobile={true} />
      <EventsTabs />
      <EditPage eventId={id} />
    </>
  );
}
