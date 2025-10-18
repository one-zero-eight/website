import { Link } from "@tanstack/react-router";

export function BookingPageTabs() {
  return (
    <div className="flex shrink-0 flex-row gap-1 overflow-x-auto whitespace-nowrap border-b-[1px] border-b-secondary-hover px-2">
      <Tab title="Timeline" to="/room-booking" exactMatch={true} />
      <Tab title="My bookings" to="/room-booking/list" />
      <Tab title="Rooms" to="/room-booking/rooms" />
      <Tab title="Rules" to="/room-booking/rules" />
    </div>
  );
}

function Tab({
  title,
  to,
  exactMatch = false,
}: {
  title: string;
  to: string;
  exactMatch?: boolean;
}) {
  return (
    <Link
      to={to}
      className="px-2 py-1"
      activeOptions={{ exact: exactMatch, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-brand-violet" }}
    >
      {title}
    </Link>
  );
}
