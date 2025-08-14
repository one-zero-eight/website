import { useMe } from "@/api/accounts/user.ts";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { AuthWall } from "@/components/common/AuthWall.tsx";
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

  const { me } = useMe();

  if (!me) {
    return <AuthWall />;
  }

  if (!me.telegram) {
    return (
      <div className="m-4 flex w-full max-w-md flex-col gap-4 rounded-2xl bg-primary px-4 py-6 @container/account">
        <img
          src="/favicon.svg"
          alt="InNoHassle logo"
          className="h-24 w-24 self-center"
        />
        <ConnectTelegramPage />
      </div>
    );
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
                  <div className="my-1 flex w-full flex-wrap justify-between">
                    <div className="text-2xl font-medium sm:text-3xl">
                      {formatDateWithDay(tagName)}
                    </div>
                    {groups[tagName].length > 0 ? (
                      <div className="mb-1 mt-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
                        {sortWorkshopsByTime(groups[tagName])
                          .filter((workshop) => workshop.is_active)
                          .map((workshop) => (
                            <WorkshopItem
                              key={workshop.id}
                              workshop={workshop}
                              openDescription={() => {
                                setModalWorkshop(workshop);
                                setModalOpen(true);
                              }}
                            />
                          ))}
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
      >
        {modalWorkshop && <Description workshop={modalWorkshop} />}
      </ModalWindow>
    </div>
  );
}
