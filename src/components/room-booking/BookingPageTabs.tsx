import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";

export function BookingPageTabs() {
  return (
    <div className="flex shrink-0 flex-row gap-1 overflow-x-auto whitespace-nowrap border-b-[1px] border-b-secondary-hover px-2">
      <Tab title="Timeline" to="/room-booking" />
      <Tab title="My bookings" to="/room-booking/list" />
      <Tab title="Rules" to="/room-booking/rules" />
    </div>
  );
}

function Tab({ title, to }: { title: string; to: string }) {
  const pathname = useLocation({
    select: ({ pathname }) => pathname,
  });

  return (
    <Link
      to={to}
      className={clsx(
        "px-2 py-1",
        pathname === to && "border-b-2 border-b-focus",
      )}
    >
      {title}
    </Link>
  );
}
