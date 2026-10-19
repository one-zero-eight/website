import { Link, LinkOptions } from "@tanstack/react-router";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import React, { PropsWithChildren, ReactElement } from "react";

export function BottomNavigation() {
  const [isPWA, setIsPWA] = React.useState<boolean>(false);

  // Adjust for iPhone's bottom navigation if installed as PWA
  React.useEffect(() => {
    const iosCheck = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsPWA(e.matches && iosCheck());
    };

    setIsPWA(mediaQuery.matches && iosCheck());

    mediaQuery.addEventListener("change", handleMediaQueryChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    <nav
      className={cn(
        "bg-base-200 flex w-full shrink-0 overflow-hidden lg:hidden",
        isPWA ? "px-6 pt-1 pb-6" : "h-12",
      )}
    >
      <BottomNavigationLink
        to="/dashboard"
        title={<Trans>Dashboard</Trans>}
        icon={
          <span className="icon-[material-symbols--space-dashboard-outline] in-[.is-active]:icon-[material-symbols--space-dashboard]" />
        }
      />
      <BottomNavigationLink
        to="/calendar"
        title={<Trans>Calendar</Trans>}
        icon={
          <span className="icon-[material-symbols--calendar-month-outline-rounded] in-[.is-active]:icon-[material-symbols--calendar-month-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/maps"
        title={<Trans>Maps</Trans>}
        icon={
          <span className="icon-[material-symbols--map-outline-rounded] in-[.is-active]:icon-[material-symbols--map-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/room-booking"
        title={<Trans>Booking</Trans>}
        icon={
          <span className="icon-[material-symbols--door-open-outline-rounded] in-[.is-active]:icon-[material-symbols--door-open-rounded]" />
        }
      />
      <BottomNavigationLink
        to="/menu"
        title={<Trans>More</Trans>}
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
}: PropsWithChildren<
  LinkOptions & { title: React.ReactNode; icon: ReactElement }
>) {
  return (
    <Link
      {...props}
      className="text-base-content/70 [&.is-active]:text-primary flex grow basis-0 flex-col items-center justify-center text-2xl select-none"
      activeProps={{ className: "is-active" }}
    >
      {icon}
      <div className="text-center text-xs in-[.is-active]:font-medium">
        {title}
      </div>
    </Link>
  );
}
