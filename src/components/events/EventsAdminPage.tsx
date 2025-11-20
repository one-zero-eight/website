import { $workshops } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventButton from "./AddEventButton.tsx";
import { ModalWindow } from "./CreationModal/ModalWindow.tsx";
import { EventListType, EventsList } from "./EventsList.tsx";
import NameForm from "./CreationModal/NameForm.tsx";

/**
 * Главная страница модуля воркшопов
 * Состояние:
 * - modalOpen: показывать ли модалку создания/редактирования
 * - modalWorkshop: воркшоп для редактирования (null = создание нового)
 */
export function EventsAdminPage() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [_, setModalDate] = useState<string | null>(null);

  const { data: events } = $workshops.useQuery("get", "/workshops/");
  const { data: eventsUser } = $workshops.useQuery("get", "/users/me");

  useEffect(() => {
    if (eventsUser && eventsUser.role !== "admin") {
      navigate({ to: "/events" });
    }
  }, [eventsUser, navigate]);

  if (eventsUser?.role !== "admin") {
    return null;
  }

  return (
    <>
      <div className="mt-3 flex w-full flex-wrap items-center gap-4 px-4 py-2">
        <span className="hidden md:block">Create new event:</span>
        <AddEventButton
          onClick={() => {
            setModalDate(null);
            setModalOpen(true);
          }}
          className="w-full md:max-w-fit"
        >
          Create event
        </AddEventButton>
      </div>

      <EventsList
        events={events}
        eventListType={EventListType.ADMIN}
        onAddEvent={(date) => {
          setModalDate(date);
          setModalOpen(true);
        }}
      />

      {/* Модальное окно для создания/редактирования воркшопа */}
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
