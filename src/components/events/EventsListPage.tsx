import { $workshops } from "@/api/workshops";
import { EventsList } from "./EventsList.tsx";

/**
 * Страница со списком воркшопов для студентов.
 */
export function EventsListPage() {
  const { data: events } = $workshops.useQuery("get", "/workshops/");

  return <EventsList events={events} />;
}
