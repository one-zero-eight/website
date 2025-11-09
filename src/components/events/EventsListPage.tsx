import { useMe } from "@/api/accounts/user.ts";
import { $workshops } from "@/api/workshops";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { EventItem } from "./EventItem.tsx";

/**
 * Страница со списком воркшопов для студентов.
 * Состояние:
 * - modalOpen: показывать ли модалку с подробным описанием
 * - modalWorkshop: выбранный воркшоп для просмотра
 */
export function EventsListPage() {
  const { data: workshops } = $workshops.useQuery("get", "/workshops/");

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
      {workshops && (
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {workshops ? (
            workshops
              .filter((workshop) => !workshop.is_draft || !workshop.is_active)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((workshop, index) => (
                <EventItem key={index} event={workshop} />
              ))
          ) : (
            <div className="col-span-full w-full text-center text-xl">
              <h2 className="text-gray-500">No workshops yet!</h2>
            </div>
          )}
        </div>
      )}
    </>
  );
}
