import { $clubs } from "@/api/clubs";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { CreationForm } from "@/components/events/EventEditPage/CreationForm";
import { EventsTabs } from "@/components/events/EventsTabs";
import { Topbar } from "@/components/layout/Topbar";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

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
  const navigate = useNavigate();
  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: id } } },
  );

  const { data: eventsUser } = $workshops.useQuery("get", "/users/me");
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

  useEffect(() => {
    if (
      eventsUser &&
      eventsUser.role === ("user" as workshopsTypes.UserRole) &&
      clubsUser &&
      clubsUser.leader_in_clubs.length === 0
    ) {
      navigate({ to: "/events" });
    }

    if (
      event?.host?.includes("club:") &&
      eventsUser &&
      eventsUser.role === ("user" as workshopsTypes.UserRole) &&
      clubsUser &&
      clubsUser.leader_in_clubs.length !== 0
    ) {
      if (
        !clubsUser?.leader_in_clubs.some(
          (c) => c.leader_innohassle_id === event?.host?.split(":")[1],
        )
      )
        navigate({ to: "/events" });
    }
  }, [eventsUser, clubsUser, navigate, event]);

  if (eventsUser?.role !== "admin" && clubsUser?.leader_in_clubs.length === 0) {
    return null;
  }

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

  return (
    <CreationForm
      clubUser={clubsUser?.leader_in_clubs.length !== 0 ? clubsUser : null}
      isAdmin={eventsUser && eventsUser.role === "admin"}
      initialEvent={event}
    />
  );
}
