import { $workshops } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventButton from "./AddEventButton.tsx";
import { ModalWindow } from "./CreationModal/ModalWindow.tsx";
import { EventsList } from "./EventsList.tsx";
import { EventListType } from "./types/index.ts";
import NameForm from "./CreationModal/NameForm.tsx";
import { $clubs } from "@/api/clubs/index.ts";

export function EventsAdminPage() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);

  const { data: events } = $workshops.useQuery("get", "/workshops/");
  const { data: eventsUser } = $workshops.useQuery("get", "/users/me");
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

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
        eventListType={
          clubsUser?.leader_in_clubs.length === 0
            ? EventListType.ADMIN
            : EventListType.CLUB_LEADER
        }
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
          onClose={() => {
            setModalOpen(false);
          }}
        />
      </ModalWindow>
    </>
  );
}
