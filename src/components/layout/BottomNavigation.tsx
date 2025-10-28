import { Link, LinkOptions } from "@tanstack/react-router";
import { PropsWithChildren, ReactElement } from "react";

export function BottomNavigation() {
  return (
    <nav className="bg-floating flex h-12 w-full shrink-0 overflow-hidden lg:hidden">
      <BottomNavigationLink
        to="/dashboard"
        title="Dashboard"
        icon={
          <span className="icon-[material-symbols--space-dashboard-outline] in-[.is-active]:icon-[material-symbols--space-dashboard]" />
        }
      />
      <BottomNavigationLink
        to="/calendar"
        title="Calendar"
        icon={
          <span className="icon-[material-symbols--calendar-month-outline-rounded] in-[.is-active]:icon-[material-symbols--calendar-month-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/maps"
        title="Maps"
        icon={
          <span className="icon-[material-symbols--map-outline-rounded] in-[.is-active]:icon-[material-symbols--map-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/room-booking"
        title="Booking"
        icon={
          <span className="icon-[material-symbols--door-open-outline-rounded] in-[.is-active]:icon-[material-symbols--door-open-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/menu"
        title="More"
        icon={
          <span className="icon-[material-symbols--menu-rounded] in-[.is-active]:icon-[material-symbols--menu-rounded]" />
        }
      />
    </nav>
  );
}

function BottomNavigationLink({
  title,
  icon,
  ...props
}: PropsWithChildren<LinkOptions & { title: string; icon: ReactElement }>) {
  return (
    <Link
      {...props}
      className="text-inactive [&.is-active]:text-brand-violet flex grow basis-0 flex-col items-center justify-center text-2xl select-none"
      activeProps={{ className: "is-active" }}
    >
      {icon}
      <div className="text-center text-xs in-[.is-active]:font-medium">
        {title}
      </div>
    </Link>
  );
}
