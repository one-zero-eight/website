import { $workshops } from "@/api/workshops";
import { EventsList } from "./EventsList.tsx";

/**
 * Страница со списком воркшопов для студентов.
 * Состояние:
 * - modalOpen: показывать ли модалку с подробным описанием
 * - modalWorkshop: выбранный воркшоп для просмотра
 */
export function EventsListPage() {
  const { data: events } = $workshops.useQuery("get", "/workshops/");

  return <EventsList events={events} />;
}
