import { $workshops, workshopsTypes } from "@/api/workshops";
import { formatDateWithDay } from "@/components/workshops/date-utils.ts";
import { PostForm } from "@/components/workshops/PostForm.tsx";
import {
  groupWorkshopsByDate,
  sortWorkshopsByTime,
} from "@/components/workshops/workshop-utils.ts";
import { WorkshopItem } from "@/components/workshops/WorkshopItem.tsx";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
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

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

  const { data: workshopsUser } = $workshops.useQuery("get", "/users/me");
  useEffect(() => {
    if (workshopsUser && workshopsUser.role !== "admin") {
      navigate({ to: "/workshops" });
    }
  }, [workshopsUser, navigate]);

  // Группируем воркшопы по датам для удобного отображения
  const groups = workshops ? groupWorkshopsByDate(workshops) : {};

  if (workshopsUser?.role !== "admin") {
    return <></>;
  }

  return (
    <div className="w-full">
      {/* Основной компонент со списком воркшопов */}
      {workshops && (
        <div className="flex flex-col gap-2 px-4 pb-28 text-center">
          {/* Условное отображение: либо список воркшопов, либо плейсхолдер */}
          {groups && Object.keys(groups).length > 0 ? (
            Object.keys(groups)
              .sort()
              .map((tagName) => (
                <React.Fragment key={tagName}>
                  <div className="my-1 flex w-full flex-col items-start">
                    <div className="flex w-full flex-wrap gap-2">
                      <div className="text-2xl font-medium sm:text-3xl">
                        {formatDateWithDay(tagName)}
                      </div>
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1 rounded-2xl border-none bg-brand-violet py-2 pl-2 pr-4 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80"
                        title="Add new workshop"
                        onClick={() => {
                          setModalDate(tagName);
                          setModalOpen(true);
                        }}
                      >
                        <span className="icon-[material-symbols--add] shrink-0 text-2xl" />
                        Add workshop
                      </button>
                    </div>
                    {groups[tagName].length > 0 ? (
                      <div className="mb-1 mt-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                        {sortWorkshopsByTime(groups[tagName]).map(
                          (workshop) => (
                            <WorkshopItem
                              key={workshop.id}
                              workshop={workshop}
                              edit={() => {
                                setModalWorkshop(workshop);
                                setModalOpen(true);
                              }}
                              openDescription={() => {
                                setModalWorkshop(workshop);
                                setModalOpen(true);
                              }}
                            />
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="col-span-full w-full text-left text-xl">
                        <h2 className="text-gray-500">No workshops yet!</h2>
                      </div>
                    )}
                  </div>
                </React.Fragment>
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
