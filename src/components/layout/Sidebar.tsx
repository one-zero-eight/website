import Tooltip from "@/components/common/Tooltip.tsx";
import SidebarSection from "@/components/layout/SidebarSection";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { createContext, useContext, useState } from "react";
import Logo from "../icons/Logo";

type Item = {
  title: string;
  badge?: React.ReactNode;
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
  ...((import.meta.env.VITE_DISABLE_SEARCH && []) || [
    {
      title: "Search",
      path: "/search",
      badge: (
        <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
          NEW
        </span>
      ),
      icon: <span className="icon-[material-symbols--search] text-4xl" />,
    },
  ]),
  {
    title: "Schedule",
    path: "/schedule",
    icon: (
      <span className="icon-[material-symbols--calendar-month-outline-rounded] text-4xl" />
    ),
  },
  ...((import.meta.env.VITE_DISABLE_BOOKING && []) || [
    {
      title: "Room booking",
      path: "/room-booking",
      icon: <span className="icon-[ph--door-open] text-4xl" />,
      badge: (
        <span className="ml-2 rounded-full bg-rose-700 px-2 py-1 text-xs font-semibold text-white">
          BETA
        </span>
      ),
    },
  ]),
  ...((import.meta.env.VITE_DISABLE_SEARCH && []) || [
    {
      title: "Maps",
      path: "/maps",
      badge: (
        <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
          NEW
        </span>
      ),
      icon: <span className="icon-[material-symbols--map-outline] text-4xl" />,
    },
  ]),
  {
    title: "Scholarship",
    path: "/scholarship",
    icon: (
      <span className="icon-[material-symbols--credit-card-outline] text-4xl" />
    ),
  },
  {
    title: "Dorms",
    path: "/rooms",
    badge: (
      <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
        NEW
      </span>
    ),
    icon: (
      <span className="icon-[material-symbols--nest-multi-room-outline-rounded] text-4xl" />
    ),
  },
  {
    title: "Music room",
    path: "/music-room",
    icon: <span className="icon-[material-symbols--piano] text-4xl" />,
  },
  {
    title: "Sport",
    path: "/sport",
    icon: (
      <span className="icon-[material-symbols--exercise-outline] text-4xl" />
    ),
  },
  {
    title: "Extension",
    path: "/extension",
    badge: (
      <span className="ml-2 rounded-full bg-focus px-2 py-1 text-xs font-semibold text-white">
        NEW
      </span>
    ),
    icon: (
      <span className="icon-[material-symbols--extension-outline] text-4xl" />
    ),
  },
];

const externalItems: Item[] = [
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

export const SidebarContext = createContext<{
  isOpened: boolean;
  setOpened: (opened: boolean) => void;
}>({ isOpened: false, setOpened: () => {} });

function Sidebar({ children }: React.PropsWithChildren) {
  const [isOpened, setOpened] = useState(false);
  const currentItem = useLocation({
    select: ({ pathname }) => items.find((v) => pathname.startsWith(v.path)),
  });

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
          "fixed top-0 z-10 h-[100dvh] shrink-0 overflow-y-auto bg-sidebar px-8 py-8 transition-transform lgw-smh:sticky lgw-smh:translate-x-0 lgw-smh:py-4 lgw-smh:transition-none",
          isOpened ? "translate-x-0 transform" : "-translate-x-full transform",
        )}
      >
        <div className="flex min-h-full flex-col items-center justify-start">
          <Link to="/" onClick={() => setOpened(false)} className="mb-4 flex">
            <Logo className="fill-text-main" />
          </Link>
          <nav className="flex grow flex-col">
            {items.map((item) => (
              <SidebarSection
                key={item.title}
                title={item.title}
                badge={item.badge}
                icon={item.icon}
                selected={currentItem?.path === item.path}
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
                badge={item.badge}
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
          <a
            href="https://t.me/one_zero_eight"
            target="_blank"
            rel="noopener noreferrer"
            className="my-4 text-center"
          >
            <span className="underline underline-offset-2">one-zero-eight</span>{" "}
            💜
          </a>
          <div className="flex flex-row gap-2">
            <Tooltip content="GitHub">
              <a
                href="https://github.com/one-zero-eight"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl"
              >
                <div className="ml-auto flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-secondary-main hover:bg-secondary-hover">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
                    <span className="icon-[mdi--github] text-4xl" />
                  </div>
                </div>
              </a>
            </Tooltip>
            <Tooltip content="Telegram">
              <a
                href="https://t.me/one_zero_eight"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl"
              >
                <div className="ml-auto flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-secondary-main hover:bg-secondary-hover">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
                    <span className="icon-[uil--telegram-alt] text-4xl" />
                  </div>
                </div>
              </a>
            </Tooltip>
            <Tooltip content="YouTube">
              <a
                href="https://www.youtube.com/@one-zero-eight"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl"
              >
                <div className="ml-auto flex h-18p w-18p flex-col items-center justify-center rounded-2xl bg-secondary-main hover:bg-secondary-hover">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
                    <span className="icon-[hugeicons--youtube] text-4xl" />
                  </div>
                </div>
              </a>
            </Tooltip>
          </div>
          <div className="mt-4 flex w-full flex-row items-center justify-center gap-4 lgw-smh:hidden">
            <SwitchThemeButton />
            <UserMenu isMobile={true} isSidebar={true} />
          </div>
        </div>
      </aside>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarMenuButton({ className }: { className?: string }) {
  const { isOpened, setOpened } = useContext(SidebarContext);

  return (
    <button className={className} onClick={() => setOpened(!isOpened)}>
      <span className="icon-[material-symbols--menu] text-4xl" />
    </button>
  );
}

export default Sidebar;
