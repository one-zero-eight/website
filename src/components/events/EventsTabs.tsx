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
    return null; // Do not show tabs if the user is not an admin
  }

  return (
    <div role="tablist" className="tabs tabs-border">
      {eventsTabs.map((tab, index) => (
        <Link
          to={tab.link}
          className="tab"
          key={index}
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{ className: "tab-active" }}
        >
          {tab.title}
        </Link>
      ))}
    </div>
  );
}
