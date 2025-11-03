import { useMe } from "@/api/accounts/user.ts";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { groupWorkshopsByDate } from "@/components/events/workshop-utils.ts";
import { useState } from "react";
import { Description } from "./Description.tsx";
import { ModalWindow } from "./ModalWindow.tsx";
import { EventForDate } from "./EventForDate.tsx";

/**
 * Страница со списком воркшопов для студентов.
 * Состояние:
 * - modalOpen: показывать ли модалку с подробным описанием
 * - modalWorkshop: выбранный воркшоп для просмотра
 */
export function EventsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalWorkshop, setModalWorkshop] =
    useState<workshopsTypes.SchemaWorkshop | null>(null);

  const [showPreviousDates, setShowPreviousDates] = useState(true); // TODO: Change to false later.

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

  // Группируем воркшопы по датам для удобного отображения
  const groups = workshops ? groupWorkshopsByDate(workshops) : undefined;

  const { me } = useMe();

  if (!me) {
    return <AuthWall />;
  }

  if (!me.telegram) {
    return (
      <div className="bg-primary @container/account m-4 flex w-full max-w-md flex-col gap-4 rounded-2xl px-4 py-6">
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
                  onSelect={(workshop) => {
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
