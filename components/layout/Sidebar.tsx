"use client";
import SidebarSection from "@/components/layout/SidebarSection";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import { useMe } from "@/lib/auth/user";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import Logo from "../icons/Logo";

type Item = {
  title: string;
  path: string;
  icon: React.ReactNode;
};

const items: Item[] = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: (
      <span className="icon-[material-symbols--space-dashboard-outline] text-4xl" />
    ),
  },
  {
    title: "Schedule",
    path: "/schedule",
    icon: (
      <span className="icon-[material-symbols--calendar-month-outline-rounded] text-4xl" />
    ),
  },
  {
    title: "Scholarship",
    path: "/scholarship",
    icon: (
      <span className="icon-[material-symbols--credit-card-outline] text-4xl" />
    ),
  },
  {
    title: "Music room",
    path: "/music-room",
    icon: <span className="icon-[material-symbols--piano] text-4xl" />,
  },
];

const externalItems: Item[] = [
  {
    title: "Sports",
    path: "https://sport.innopolis.university",
    icon: (
      <span className="icon-[material-symbols--exercise-outline] text-4xl" />
    ),
  },
  {
    title: "Moodle",
    path: "https://moodle.innopolis.university",
    icon: (
      <span className="icon-[material-symbols--school-outline-rounded] text-4xl" />
    ),
  },
  {
    title: "Baam",
    path: "https://baam.duckdns.org/s",
    icon: (
      <span className="icon-[material-symbols--qr-code-rounded] text-4xl" />
    ),
  },
  {
    title: "Innopoints",
    path: "https://ipts.innopolis.university/",
    icon: (
      <span className="icon-[material-symbols--loyalty-outline-rounded] text-4xl" />
    ),
  },
  {
    title: "My University",
    path: "https://my.university.innopolis.ru",
    icon: (
      <span className="icon-[material-symbols--account-circle-outline] text-4xl" />
    ),
  },
];

export const SidebarContext = React.createContext<{
  isOpened: boolean;
  setOpened: (opened: boolean) => void;
}>({ isOpened: false, setOpened: () => {} });

function Sidebar({ children }: React.PropsWithChildren) {
  const { me } = useMe();
  const pathname = usePathname();
  const currentItem = items.find((v) => pathname.startsWith(v.path));
  const selection = currentItem?.title;
  const [isOpened, setOpened] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOpened, setOpened }}>
      <div
        className={clsx(
          "fixed inset-0 flex transition-colors lgw-smh:hidden",
          isOpened ? "visible z-[2] block bg-black/50" : "z-[-1] bg-black/0",
        )}
        onClick={() => setOpened(false)}
      />
      <aside
        className={clsx(
          "fixed top-0 z-10 h-[100dvh] overflow-y-auto bg-sidebar transition-transform lgw-smh:sticky lgw-smh:translate-x-0 lgw-smh:overflow-visible lgw-smh:transition-none",
          isOpened ? "translate-x-0 transform" : "-translate-x-full transform",
        )}
      >
        <div className="flex flex-col items-center justify-center px-8 py-8 lgw-smh:h-full lgw-smh:py-4">
          <Link
            href={me ? "/dashboard" : "/schedule"}
            onClick={() => setOpened(false)}
            className="mb-4 flex"
          >
            <Logo className="fill-text-main" />
          </Link>
          <nav className="flex-col">
            {items.map((item) => (
              <SidebarSection
                key={item.title}
                title={item.title}
                icon={item.icon}
                selected={selection === item.title}
                path={item.path}
                onClick={() =>
                  item.path !== "#" ? setOpened(false) : undefined
                }
              />
            ))}
            <div className="mx-2.5 my-1 h-0.5 rounded-full bg-gray-500/20" />
            {externalItems.map((item) => (
              <SidebarSection
                key={item.title}
                title={item.title}
                icon={item.icon}
                selected={false}
                path={item.path}
                onClick={() =>
                  item.path !== "#" ? setOpened(false) : undefined
                }
                external={true}
              />
            ))}
          </nav>
          <div className="flex grow"></div>
          <br />
          <div className="mb-4 flex w-full flex-row items-center justify-center gap-4 lgw-smh:hidden">
            <SwitchThemeButton />
            <UserMenu isMobile={true} isSidebar={true} />
          </div>
          <a
            className="text-center lgw-smh:text-left"
            href="https://t.me/one_zero_eight"
          >
            <span className="hidden lgw-smh:inline">
              See you at
              <br />
            </span>
            <span className="underline underline-offset-2">
              one-zero-eight
            </span>{" "}
            💜
          </a>
        </div>
      </aside>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarMenuButton({ className }: { className?: string }) {
  const { isOpened, setOpened } = React.useContext(SidebarContext);

  return (
    <button className={className} onClick={() => setOpened(!isOpened)}>
      <span className="icon-[material-symbols--menu] text-4xl" />
    </button>
  );
}

export default Sidebar;
