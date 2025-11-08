import { useMe } from "@/api/accounts/user.ts";
import { $workshops } from "@/api/workshops";
import { ConnectTelegramPage } from "@/components/account/ConnectTelegramPage.tsx";
import { AuthWall } from "@/components/common/AuthWall.tsx";
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

  if (!me) {
    return <AuthWall />;
  }

  if (!me.telegram) {
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
        <div className="flex flex-col gap-4 p-4">
          {workshops ? (
            workshops
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((workshop, index) => (
                <EventItem key={index} workshop={workshop} />
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
