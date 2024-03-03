"use client";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import { useUsersGetMe } from "@/lib/events";
import UserMenu from "@/components/layout/UserMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import Logo from "../icons/Logo";
import SidebarSection from "@/components/layout/SidebarSection";
import clsx from "clsx";

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
  isMobile: boolean;
}>({ isOpened: false, setOpened: () => {}, isMobile: false });

function Sidebar({ children }: React.PropsWithChildren) {
  const { data: user } = useUsersGetMe();
  const pathname = usePathname();
  const currentItem = items.find((v) => pathname.startsWith(v.path));
  const selection = currentItem?.title;
  const { width, height } = useWindowSize();
  const [isMobile, setMobile] = useState(false);
  const [isOpened, setOpened] = useState(false);

  useEffect(() => {
    if (width >= 1024 && height >= 600) {
      setMobile(false);
      setOpened(true);
    } else {
      setMobile(true);
      setOpened(false);
    }
  }, [width, height]);

  return (
    <SidebarContext.Provider value={{ isOpened, setOpened, isMobile }}>
      {isMobile && isOpened ? (
          <div
              className={clsx(
                  "fixed inset-0 transition-colors",
                  isOpened ? "visible z-[2] block bg-black/50" : "z-[-1] bg-black/0",
              )}
              onClick={() => setOpened(false)}
          />
      ) : (
          <></>
      )}
        <aside
          className={clsx(
            "flex h-[100dvh] flex-col items-center bg-sidebar px-8 transition-transform",
              isMobile ? "fixed z-10 overflow-y-auto py-8" : "sticky py-4",
              isOpened ? "translate-x-0 transform" : "-translate-x-full transform",
          )}
        >
            <Link
              href={user ? "/dashboard" : "/schedule"}
              onClick={() => setOpened(false)}
              className="mb-4 flex"
            >
              <Logo className="fill-text-main" />
            </Link>
            <nav className="flex-col">
              {items.map((item) => (
                <div
                  key={item.title}
                  onClick={() =>
                    item.path !== "#" ? setOpened(false) : undefined
                  }
                >
                  <SidebarSection
                    title={item.title}
                    icon={item.icon}
                    selected={selection === item.title}
                    path={item.path}
                    onClick={() => setOpened(false)}
                  />
                </div>
              ))}
              <div className="mx-2.5 my-1 h-0.5 rounded-full bg-gray-500/20" />
              {externalItems.map((item) => (
                <div
                  key={item.title}
                  onClick={() =>
                    item.path !== "#" ? setOpened(false) : undefined
                  }
                >
                  <SidebarSection
                    title={item.title}
                    icon={item.icon}
                    selected={false}
                    path={item.path}
                    onClick={() => setOpened(false)}
                    external={true}
                  />
                </div>
              ))}
            </nav>
            <div className="flex grow"></div>
            <br />
            <div className="mb-2 flex w-full flex-row items-center justify-center gap-4">
              <SwitchThemeButton />
              <UserMenu isMobile={true} isSidebar={true} />
            </div>
            <a
              className="w-full text-center"
              href="https://t.me/one_zero_eight"
            >
              one-zero-eight 💜
            </a>
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
