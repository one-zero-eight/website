import { $workshops } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EventsList } from "./EventsList.tsx";
import { useEventsAuth } from "./hooks";
import { EventListOptions } from "./types/index.ts";

export function EventsArchivePage() {
  const navigate = useNavigate();
  const { eventsUser, clubsUser } = useEventsAuth();

  const { data: events } = $workshops.useQuery("get", "/workshops/");

  useEffect(() => {
    if (
      eventsUser &&
      eventsUser.role !== "admin" &&
      clubsUser &&
      clubsUser.leader_in_clubs.length === 0
    ) {
      navigate({ to: "/events" });
    }
  }, [eventsUser, clubsUser, navigate]);

  if (eventsUser?.role !== "admin" && clubsUser?.leader_in_clubs.length === 0) {
    return null;
  }

  const isAdmin = eventsUser?.role === "admin";
  const leaderClubIds = clubsUser?.leader_in_clubs.map((c) => c.id) ?? [];
  const eventListSettings: EventListOptions = {
    showMyCheckins: false,
    showPreviousEvents: false,
    filterDraftsAndInactive: false,
    isEditable: isAdmin,
    editableClubIds: leaderClubIds,
    onlyShowDraftsFromEditableClubs: !isAdmin && leaderClubIds.length > 0,
    hideShowPreviousToggle: true,
    onlyPastEvents: true,
  };

  return (
    <EventsList
      events={events}
      options={eventListSettings}
      clubUser={clubsUser}
    />
  );
}
