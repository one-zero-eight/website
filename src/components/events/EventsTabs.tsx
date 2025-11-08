import { $workshops } from "@/api/workshops";
import { Link } from "@tanstack/react-router";

type EventsTab = {
  link: string;
  title: string;
};

const eventsTabs: EventsTab[] = [
  { link: "/events", title: "Check In" },
  { link: "/events/admin", title: "Admin" },
];

export function EventsTabs() {
  const { data: workshopsUser } = $workshops.useQuery("get", "/users/me");

  if (workshopsUser?.role !== "admin") {
    return null; // Do not show admin tab if the user is not an admin
  }

  return (
    <div className="border-b-inh-secondary-hover flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
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
