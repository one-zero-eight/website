import { Link } from "@tanstack/react-router";
import { useEventsAuth } from "./hooks";

type EventsTab = {
  link: string;
  title: string;
};

const eventsTabs: EventsTab[] = [
  { link: "/events", title: "List" },
  { link: "/events/admin", title: "Manage" },
  { link: "/events/archive", title: "Archive" },
];

export function EventsTabs() {
  const { eventsUser, clubsUser } = useEventsAuth();

  if (
    eventsUser?.role !== "admin" &&
    (clubsUser?.leader_in_clubs?.length ?? 0) === 0
  ) {
    return null; // Do not show admin tab if the user is not an admin and if not club leader
  }

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      {eventsTabs.map((tab, index) => (
        <Link
          to={tab.link}
          className="px-2 py-1"
          key={index}
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{ className: "border-b-2 border-b-primary" }}
        >
          {tab.title}
        </Link>
      ))}
    </div>
  );
}
