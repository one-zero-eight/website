import { $workshops, workshopsTypes } from "@/api/workshops";
import { groupWorkshopsByDate } from "@/components/events/event-utils.ts";
import {
  EventForDate,
  EventForDateType,
} from "@/components/events/EventForDate.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AddEventButton from "../AddEventButton.tsx";
import { CreationForm } from "../EventCreationModal/CreationForm.tsx";
import { ModalWindow } from "../EventCreationModal/ModalWindow.tsx";

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

  const [showPreviousDates, setShowPreviousDates] = useState(false);

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

  const { data: workshopsUser } = $workshops.useQuery("get", "/users/me");
  useEffect(() => {
    if (workshopsUser && workshopsUser.role !== "admin") {
      navigate({ to: "/events" });
    }
  }, [workshopsUser, navigate]);

  // Группируем воркшопы по датам для удобного отображения
  const groups = workshops ? groupWorkshopsByDate(workshops) : undefined;

  if (workshopsUser?.role !== "admin") {
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

      <div className="collapse-arrow collapse">
        <input
          type="checkbox"
          onClick={() => setShowPreviousDates(!showPreviousDates)}
        />
        <div className="collapse-title ps-11 text-left after:start-5 after:end-auto">
          {showPreviousDates ? "Hide previous dates" : "Show previous dates"}
        </div>
        <div className="collapse-content h-full">
          {workshops && groups && Object.keys(groups).length > 0 ? (
            Object.keys(groups)
              .sort((a: string, b: string) => b.localeCompare(a))
              .map((tagName, index) => (
                <EventForDate
                  key={index}
                  isoDate={tagName}
                  workshops={groups[tagName]}
                  showPreviousDates={showPreviousDates}
                  eventForDateType={EventForDateType.ADMIN}
                  onAddWorkshop={(date) => {
                    setModalDate(date);
                    setModalOpen(true);
                  }}
                  onEditWorkshop={(workshop) => {
                    setModalWorkshop(workshop);
                    setModalOpen(true);
                  }}
                />
              ))
          ) : (
            <div className="col-span-full w-full text-center text-xl">
              <h2 className="text-gray-500">No workshops yet!</h2>
            </div>
          )}
        </div>
      </div>

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
