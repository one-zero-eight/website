import { useMe } from "@/api/accounts/user.ts";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { PostForm } from "@/components/workshops/PostForm.tsx";
import {
  groupWorkshopsByDate,
  sortWorkshops,
} from "@/components/workshops/workshop-utils.ts";
import { WorkshopItem } from "@/components/workshops/WorkshopItem.tsx";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { ModalWindow } from "./ModalWindow.tsx";

/**
 * Главная страница модуля воркшопов
 * Состояние:
 * - modalOpen: показывать ли модалку создания/редактирования
 * - modalWorkshop: воркшоп для редактирования (null = создание нового)
 */
export function WorkshopsAdminPage() {
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
    return <></>;
  }

  return (
    <div className="w-full">
      <div className="col-span-full w-full px-4 text-left text-xl">
        <button
          onClick={() => setShowPreviousDates((v) => !v)}
          className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
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
                <WorkshopsForDate
                  key={tagName}
                  isoDate={tagName}
                  workshops={groups[tagName]}
                  showPreviousDates={showPreviousDates}
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

      <div className="flex w-full flex-wrap gap-4 px-4 py-2">
        <button
          type="button"
          className="bg-primary hover:bg-primary/80 rounded-box flex cursor-pointer items-center gap-1 border-none py-1 pr-4 pl-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out"
          title="Add new workshop"
          onClick={() => {
            setModalDate(null);
            setModalOpen(true);
          }}
        >
          <span className="icon-[material-symbols--add] shrink-0 text-xl" />
          Add workshop
        </button>
      </div>

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

function WorkshopsForDate({
  isoDate,
  workshops,
  showPreviousDates,
  onAddWorkshop,
  onEditWorkshop,
}: {
  isoDate: string;
  workshops: workshopsTypes.SchemaWorkshop[];
  showPreviousDates: boolean;
  onAddWorkshop: (date: string) => void;
  onEditWorkshop: (workshop: workshopsTypes.SchemaWorkshop) => void;
}) {
  const date = useMemo(() => new Date(isoDate), [isoDate]);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isPreviousDate = date < startOfDay;

  const [shouldShow, setShouldShow] = useState(!isPreviousDate);

  if (isPreviousDate && !showPreviousDates) {
    return null;
  }

  return (
    <React.Fragment>
      <div className="my-1 flex w-full flex-col items-start">
        <div className="flex w-full flex-wrap gap-4">
          <div className="text-2xl font-medium sm:text-3xl">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <button
            type="button"
            className="bg-primary hover:bg-primary/80 rounded-box flex cursor-pointer items-center gap-1 border-none py-1 pr-4 pl-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out"
            title="Add new workshop"
            onClick={() => onAddWorkshop(isoDate)}
          >
            <span className="icon-[material-symbols--add] shrink-0 text-xl" />
            Add workshop
          </button>
        </div>
        {shouldShow ? (
          <>
            {workshops.length > 0 ? (
              <div className="mt-4 mb-1 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                {sortWorkshops(workshops).map((workshop) => (
                  <WorkshopItem
                    key={workshop.id}
                    workshop={workshop}
                    edit={() => onEditWorkshop(workshop)}
                    openDescription={() => onEditWorkshop(workshop)}
                  />
                ))}
              </div>
            ) : (
              <div className="col-span-full w-full text-left text-xl">
                <h2 className="text-gray-500">No workshops yet!</h2>
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full w-full text-left text-xl">
            <button
              onClick={() => setShouldShow(true)}
              className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
            >
              Show workshops
            </button>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
