import { useMe } from "@/api/accounts/user.ts";
import { $workshops, workshopsTypes } from "@/api/workshops";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { groupWorkshopsByDate } from "@/components/events/event-utils.ts";
import { useState } from "react";
import { Description } from "./EventPage/Description.tsx";
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

  const [showPreviousDates, setShowPreviousDates] = useState(false);

  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

  // Группируем воркшопы по датам для удобного отображения
  const groups = workshops ? groupWorkshopsByDate(workshops) : undefined;

  const { me } = useMe();

  if (!me?.telegram) {
    return (
      <div className="bg-inh-primary rounded-box @container/account m-4 flex w-full max-w-md flex-col gap-4 px-4 py-6">
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
    <>
      <div className="collapse-arrow collapse">
        <input
          type="checkbox"
          onClick={() => setShowPreviousDates(!showPreviousDates)}
        />
        <div className="collapse-title ps-11 text-left after:start-5 after:end-auto">
          {showPreviousDates ? "Hide previous dates" : "Show previous dates"}
        </div>
        {/* Основной компонент со списком воркшопов */}
        {workshops && (
          <div className="collapse-content">
            {/* Условное отображение: либо список воркшопов, либо плейсхолдер */}
            {groups && Object.keys(groups).length > 0 ? (
              Object.keys(groups)
                .sort((a: string, b: string) => b.localeCompare(a))
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
      </div>

      {/* Модальное окно с подробным описанием воркшопа */}
      <ModalWindow
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalWorkshop?.name}
      >
        {modalWorkshop && <Description workshop={modalWorkshop} />}
      </ModalWindow>
    </>
  );
}
