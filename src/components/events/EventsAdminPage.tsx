import { useMe } from "@/api/accounts/user.ts";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { PostForm } from "@/components/events/PostForm.tsx";
import { groupWorkshopsByDate } from "@/components/events/workshop-utils.ts";
import {
  EventForDate,
  EventForDateType,
} from "@/components/events/EventForDate.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModalWindow } from "./ModalWindow.tsx";
import AddEventButton from "./AddEventButton.tsx";

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

  const { me } = useMe();

  if (!me) {
    return <AuthWall />;
  }

  if (workshopsUser?.role !== "admin") {
    return null;
  }

  return (
    <div className="w-full select-none">
      <div className="flex w-full flex-wrap items-center gap-4 px-4 py-2">
        Create new event:
        <AddEventButton
          onClick={() => {
            setModalDate(null);
            setModalOpen(true);
          }}
        >
          Create event
        </AddEventButton>
      </div>
      <div className="col-span-full w-full px-4 text-left text-xl">
        <button
          onClick={() => setShowPreviousDates((v) => !v)}
          className="text-brand-violet hover:text-brand-violet/80 mt-2 text-sm transition-colors duration-200"
        >
          {showPreviousDates ? "Hide previous dates" : "Show previous dates"}
        </button>
      </div>
      {/* Основной компонент со списком воркшопов */}
      {workshops && (
        <div className="flex flex-col gap-2 px-4 text-center">
          {/* Условное отображение: либо список воркшопов, либо плейсхолдер */}
          {groups && Object.keys(groups).length > 0 ? (
            Object.keys(groups)
              .sort()
              .map((tagName) => (
                <EventForDate
                  key={tagName}
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
      )}

      {/* Модальное окно для создания/редактирования воркшопа */}
      <ModalWindow
        open={modalOpen}
        onOpenChange={() => {
          setModalOpen(false);
          setModalWorkshop(null);
        }}
        title={modalWorkshop ? "Edit workshop" : "Create workshop"}
      >
        {/* Форма создания/редактирования воркшопа
            При редактировании передаются данные существующего воркшопа */}
        <PostForm
          initialWorkshop={modalWorkshop ?? undefined}
          initialDate={modalDate ?? undefined}
          onClose={() => {
            setModalOpen(false);
            setModalWorkshop(null);
          }}
        />
      </ModalWindow>
    </div>
  );
}
