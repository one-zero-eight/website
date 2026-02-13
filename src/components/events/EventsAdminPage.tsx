import { $workshops } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventButton from "./AddEventButton.tsx";
import { ModalWindow } from "./CreationModal/ModalWindow.tsx";
import { EventsList } from "./EventsList.tsx";
import NameForm from "./CreationModal/NameForm.tsx";
import { useEventsAuth } from "./hooks";
import { EventListOptions } from "./types/index.ts";

export function EventsAdminPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
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
    showPreviousEvents: true,
    filterDraftsAndInactive: false,
    isEditable: isAdmin,
    editableClubIds: leaderClubIds,
    onlyShowDraftsFromEditableClubs: !isAdmin && leaderClubIds.length > 0,
  };

  return (
    <>
      <div className="mt-3 flex w-full flex-wrap items-center gap-4 px-4 py-2">
        <span className="hidden md:block">Create new event:</span>
        <AddEventButton
          onClick={() => setModalOpen(true)}
          className="w-full md:max-w-fit"
        >
          Create event
        </AddEventButton>
      </div>

      <EventsList
        events={events}
        options={eventListSettings}
        clubUser={clubsUser}
      />

      <ModalWindow
        open={modalOpen}
        onOpenChange={() => {
          setModalOpen(false);
        }}
        title="Create Event"
      >
        <NameForm
          eventsUser={eventsUser}
          clubsUser={clubsUser}
          onClose={() => {
            setModalOpen(false);
          }}
        />
      </ModalWindow>
    </>
  );
}
