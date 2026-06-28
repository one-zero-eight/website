import { Link } from "@tanstack/react-router";
import { useEventsAuth } from "./hooks";

type EventsTab = {
  link: string;
  title: string;
};

const listTab: EventsTab = { link: "/events", title: "List" };
const calendarTab: EventsTab = { link: "/events/calendar", title: "Calendar" };
const manageTab: EventsTab = { link: "/events/admin", title: "Manage" };
const archiveTab: EventsTab = { link: "/events/archive", title: "Archive" };

export function EventsTabs() {
  const { isAdmin, isClubLeader } = useEventsAuth();

  const eventsTabs = [
    listTab,
    calendarTab,
    ...(isAdmin || isClubLeader ? [manageTab, archiveTab] : []),
  ];

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      {eventsTabs.map((tab) => (
        <Link
          to={tab.link}
          className="px-2 py-1"
          key={tab.link}
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{ className: "border-b-2 border-b-primary" }}
        >
          {tab.title}
        </Link>
      ))}
    </div>
  );
}
