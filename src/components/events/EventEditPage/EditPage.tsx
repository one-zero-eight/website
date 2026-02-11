import { $clubs } from "@/api/clubs";
import { $workshops } from "@/api/workshops";
import { HostType, UserRole } from "@/api/workshops/types";
import { EventEditForm } from "@/components/events/EventEditPage/EventEditForm";
import { useEventsAuth } from "@/components/events/hooks";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

interface EditPageProps {
  eventId: string;
}

export default function EditPage({ eventId }: EditPageProps) {
  const navigate = useNavigate();
  const { eventsUser, clubsUser } = useEventsAuth();

  const { data: event, isLoading } = $workshops.useQuery(
    "get",
    "/workshops/{workshop_id}",
    { params: { path: { workshop_id: eventId } } },
  );

  const { data: clubsList = [] } = $clubs.useQuery("get", "/clubs/");

  const isAdmin = eventsUser?.role === UserRole.admin;
  const isClubLeader = (clubsUser?.leader_in_clubs?.length ?? 0) > 0;

  useEffect(() => {
    if (!eventsUser || !clubsUser) return;

    if (!isAdmin && !isClubLeader) {
      navigate({ to: "/events" });
      return;
    }

    if (!event) return;

    if (isClubLeader && !isAdmin) {
      const eventClubId = event.host?.find(
        (h) =>
          h?.host_type === HostType.club || String(h?.host_type) === "club",
      )?.name;
      const canEdit =
        eventClubId &&
        clubsUser.leader_in_clubs?.some((c) => c.id === eventClubId);
      if (!canEdit) {
        navigate({ to: "/events/admin" });
      }
    }
  }, [eventsUser, clubsUser, event, isAdmin, isClubLeader, navigate]);

  if (!isAdmin && !isClubLeader) {
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
    <EventEditForm
      clubUser={isClubLeader ? (clubsUser ?? null) : null}
      isAdmin={isAdmin}
      initialEvent={event}
      clubsList={clubsList}
    />
  );
}
