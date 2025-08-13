import { $workshops, workshopsTypes } from "@/api/workshops";
import { formatDateWithDay } from "@/components/workshops/date-utils.ts";
import {
  groupWorkshopsByDate,
  sortWorkshopsByTime,
} from "@/components/workshops/workshop-utils.ts";
import { WorkshopItem } from "@/components/workshops/WorkshopItem.tsx";
import React, { useState } from "react";
import { Description } from "./Description.tsx";
import { ModalWindow } from "./ModalWindow.tsx";

/**
 * Страница со списком воркшопов для студентов.
 * Состояние:
 * - modalOpen: показывать ли модалку с подробным описанием
 * - modalWorkshop: выбранный воркшоп для просмотра
 */
export function WorkshopsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalWorkshop, setModalWorkshop] =
    useState<workshopsTypes.SchemaWorkshop | null>(null);

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

  // Группируем воркшопы по датам для удобного отображения
  const groups = workshops ? groupWorkshopsByDate(workshops) : undefined;

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
                  <div className="my-1 flex w-full flex-wrap justify-between">
                    <div className="text-2xl font-medium sm:text-3xl">
                      {formatDateWithDay(tagName)}
                    </div>
                    {groups[tagName].length > 0 ? (
                      <div className="mb-1 mt-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                        {sortWorkshopsByTime(groups[tagName]).map(
                          (workshop) => (
                            <WorkshopItem
                              key={workshop.id}
                              workshop={workshop}
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

      {/* Модальное окно с подробным описанием воркшопа */}
      <ModalWindow
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalWorkshop?.name}
        className="whitespace-pre-wrap break-words"
      >
        {modalWorkshop && <Description workshop={modalWorkshop} />}
      </ModalWindow>
    </div>
  );
}
