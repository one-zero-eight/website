import { $workshops, workshopsTypes } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventButton from "./AddEventButton.tsx";
import { CreationForm } from "./EventCreationModal/CreationForm.tsx";
import { ModalWindow } from "./EventCreationModal/ModalWindow.tsx";
import { EventListType, EventsList } from "./EventsList.tsx";

/**
 * Главная страница модуля воркшопов
 * Состояние:
 * - modalOpen: показывать ли модалку создания/редактирования
 * - modalWorkshop: воркшоп для редактирования (null = создание нового)
 */
export function EventsAdminPage() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalWorkshop, setModalWorkshop] =
    useState<workshopsTypes.SchemaWorkshop | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);

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
      <div className="flex w-full flex-wrap items-center gap-4 px-4 py-2">
        Create new event:
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
        onEditEvent={(event) => {
          setModalWorkshop(event);
          setModalOpen(true);
        }}
      />

      {/* Модальное окно для создания/редактирования воркшопа */}
      <ModalWindow
        open={modalOpen}
        onOpenChange={() => {
          setModalOpen(false);
          setModalWorkshop(null);
        }}
        title={modalWorkshop ? "Edit Event" : "Create Event"}
      >
        {/* Форма создания/редактирования воркшопа. При редактировании передаются данные существующего воркшопа */}
        <CreationForm
          initialEvent={modalWorkshop ?? undefined}
          initialDate={modalDate ?? undefined}
          onClose={() => {
            setModalOpen(false);
            setModalWorkshop(null);
          }}
        />
      </ModalWindow>
    </>
  );
}
