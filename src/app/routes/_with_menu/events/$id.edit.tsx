import { $workshops } from "@/api/workshops";
import { CreationForm } from "@/components/events/EventEditPage/CreationForm";
import { EventsTabs } from "@/components/events/EventsTabs";
import { Topbar } from "@/components/layout/Topbar";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, Link } from "@tanstack/react-router";

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
      <EditPage id={id} />
    </>
  );
}

interface EditPageProps {
  id: string;
}

export default function EditPage({ id }: EditPageProps) {
  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: id } } },
  );

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  if (!event)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="text-xl font-semibold">404 - Event not found</span>
        <Link className="btn btn-outline btn-sm" to="/events">
          <span className="icon-[solar--arrow-left-linear] text-xl" />
          Go back
        </Link>
      </div>
    );

  return <CreationForm initialEvent={event} />;
}
