import { Link, LinkOptions } from "@tanstack/react-router";
import { PropsWithChildren, ReactElement } from "react";

export function BottomNavigation() {
  return (
    <nav className="flex h-12 w-full shrink-0 overflow-hidden bg-floating lgw-smh:hidden">
      <BottomNavigationLink
        to="/dashboard"
        title="Dashboard"
        icon={
          <span className="icon-[material-symbols--space-dashboard-outline] [.is-active_&]:icon-[material-symbols--space-dashboard]" />
        }
      />
      <BottomNavigationLink
        to="/calendar"
        title="Calendar"
        icon={
          <span className="icon-[material-symbols--calendar-month-outline-rounded] [.is-active_&]:icon-[material-symbols--calendar-month-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/maps"
        title="Maps"
        icon={
          <span className="icon-[material-symbols--map-outline-rounded] [.is-active_&]:icon-[material-symbols--map-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/room-booking"
        title="Booking"
        icon={
          <span className="icon-[material-symbols--door-open-outline-rounded] [.is-active_&]:icon-[material-symbols--door-open-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/menu"
        title="More"
        icon={
          <span className="icon-[material-symbols--menu-rounded] [.is-active_&]:icon-[material-symbols--menu-rounded]" />
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
      className="flex grow basis-0 select-none flex-col items-center justify-center text-2xl text-inactive [&.is-active]:text-brand-violet"
      activeProps={{ className: "is-active" }}
    >
      {icon}
      <div className="text-center text-xs [.is-active_&]:font-medium">
        {title}
      </div>
    </Link>
  );
}
