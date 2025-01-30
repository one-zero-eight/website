import Tooltip from "@/components/common/Tooltip.tsx";
import { LeaveFeedbackButton } from "@/components/layout/LeaveFeedbackButton.tsx";
import SidebarSection from "@/components/layout/SidebarSection";
import SwitchThemeButton from "@/components/layout/SwitchThemeButton";
import UserMenu from "@/components/layout/UserMenu";
import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { createContext, useContext, useState } from "react";
import { useLocalStorage, useMediaQuery } from "usehooks-ts";
import Logo from "../icons/Logo";

type LocalLink = {
  type: "local";
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
};
type ExternalLink = {
  type: "external";
  title: string;
  link: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
};
type SeparatorItem = {
  type: "separator";
};

const items: (LocalLink | ExternalLink | SeparatorItem)[] = [
  ...((import.meta.env.VITE_HIDE_SEARCH && []) || [
    {
      type: "local",
      title: "Search",
      path: "/search",
      icon: <span className="icon-[material-symbols--search]" />,
      badge: (
        <span className="ml-2 rounded-full bg-brand-violet px-2 py-1 text-xs font-semibold text-white">
          NEW
        </span>
      ),
    },
    { type: "separator" },
  ]),
  {
    type: "local",
    title: "Dashboard",
    path: "/dashboard",
    icon: <span className="icon-[material-symbols--space-dashboard-outline]" />,
  },
  {
    type: "local",
    title: "Maps",
    path: "/maps",
    icon: <span className="icon-[material-symbols--map-outline]" />,
  },
  {
    type: "local",
    title: "Room booking",
    path: "/room-booking",
    icon: <span className="icon-[ph--door-open]" />,
  },
  { type: "separator" },
  {
    type: "local",
    title: "Schedule",
    path: "/schedule",
    icon: <span className="icon-[mdi--calendars]" />,
  },
  {
    type: "local",
    title: "Scholarship",
    path: "/scholarship",
    icon: <span className="icon-[material-symbols--credit-card-outline]" />,
  },
  {
    type: "local",
    title: "Dorms",
    path: "/dorms",
    icon: (
      <span className="icon-[material-symbols--nest-multi-room-outline-rounded]" />
    ),
  },
  {
    type: "local",
    title: "Music room",
    path: "/music-room",
    icon: <span className="icon-[material-symbols--piano]" />,
  },
  {
    type: "local",
    title: "Sport",
    path: "/sport",
    icon: <span className="icon-[material-symbols--exercise-outline]" />,
  },
  {
    type: "local",
    title: "Extension",
    path: "/extension",
    icon: <span className="icon-[material-symbols--extension-outline]" />,
  },
  { type: "separator" },
  {
    type: "external",
    title: "Moodle",
    link: "https://moodle.innopolis.university",
    icon: <span className="icon-[material-symbols--school-outline-rounded]" />,
  },
  {
    type: "external",
    title: "Baam",
    link: "https://baam.tatar/s",
    icon: <span className="icon-[material-symbols--qr-code-rounded]" />,
  },
  {
    type: "external",
    title: "Innopoints",
    link: "https://ipts.innopolis.university/",
    icon: <span className="icon-[material-symbols--loyalty-outline-rounded]" />,
  },
  {
    type: "external",
    title: "My University",
    link: "https://my.university.innopolis.ru",
    icon: <span className="icon-[material-symbols--account-circle-outline]" />,
  },
  {
    type: "external",
    title: "InnoDataHub",
    link: "https://booking-innodatahub.innopolis.university",
    icon: <span className="icon-[material-symbols--memory-outline-rounded]" />,
  },
];

export const SidebarContext = createContext<{
  isOpened: boolean;
  setOpened: (opened: boolean) => void;
}>({ isOpened: false, setOpened: () => {} });

function Sidebar({ children }: React.PropsWithChildren) {
  const [isOpened, setOpened] = useState(false);
  const [_isMinimized, setMinimized] = useLocalStorage(
    "sidebar-minimized",
    false,
  );
  const currentItem = useLocation({
    select: ({ pathname }) =>
      items.find((v) => v.type === "local" && pathname.startsWith(v.path)) as
        | LocalLink
        | undefined,
  });

  const isDesktop = useMediaQuery(
    "(min-width: 1024px) and (min-height: 600px)",
  );
  const isMinimized = isDesktop && _isMinimized;

  return (
    <SidebarContext.Provider value={{ isOpened, setOpened }}>
      <div
        className={clsx(
          "fixed inset-0 flex transition-colors lgw-smh:hidden",
          isOpened ? "visible z-[10] block bg-black/50" : "z-[-1] bg-black/0",
        )}
        onClick={() => setOpened(false)}
      />
      <aside
        className={clsx(
          "fixed top-0 z-10 h-full shrink-0 overflow-y-auto bg-floating py-4 transition-transform lgw-smh:sticky lgw-smh:translate-x-0 lgw-smh:transition-none",
          !isMinimized ? "px-4" : "px-1",
          isOpened ? "translate-x-0 transform" : "-translate-x-full transform",
        )}
      >
        {/* Chevron to minimize/maximize the desktop sidebar */}
        <button
          onClick={() => setMinimized((v) => !v)}
          className="absolute right-0 top-0 hidden rounded-xl p-0.5 hover:bg-secondary lgw-smh:flex"
        >
          <span
            className="icon-[material-symbols--chevron-left-rounded] text-2xl text-inactive"
            style={{
              transform: isMinimized ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Menu items */}
        <div className="flex min-h-full flex-col items-start justify-start">
          <Link
            to="/"
            onClick={() => setOpened(false)}
            className="flex place-self-center"
          >
            <Logo className={clsx(isMinimized && "h-10 w-10")} />
          </Link>

          {items.map((item, index) =>
            item.type === "separator" ? (
              <div
                key={index}
                className="my-1 h-0.5 w-full rounded-full bg-gray-500/20"
              />
            ) : item.type === "local" ? (
              <SidebarSection
                key={index}
                title={item.title}
                badge={item.badge}
                icon={item.icon}
                selected={currentItem?.path === item.path}
                path={item.path}
                onClick={() =>
                  item.path !== "#" ? setOpened(false) : undefined
                }
                isMinimized={isMinimized}
              />
            ) : (
              <SidebarSection
                key={index}
                title={item.title}
                badge={item.badge}
                icon={item.icon}
                selected={false}
                path={item.link}
                onClick={() =>
                  item.link !== "#" ? setOpened(false) : undefined
                }
                isMinimized={isMinimized}
                external={true}
              />
            ),
          )}

          <div className="flex grow"></div>
          {/* Mobile buttons */}
          <div
            className={clsx(
              "flex place-self-center lgw-smh:hidden",
              !isMinimized ? "flex-row gap-2" : "flex-col",
            )}
          >
            <SwitchThemeButton />
            <LeaveFeedbackButton />
            <UserMenu isMobile={true} isSidebar={true} />
          </div>
          <div className="my-1 flex h-0.5 w-full rounded-full bg-gray-500/20 lgw-smh:hidden" />
          {/* Social links */}
          <div
            className={clsx(
              "flex place-self-center",
              !isMinimized ? "flex-row gap-2" : "flex-col",
            )}
          >
            <Tooltip content="GitHub">
              <a
                href="https://github.com/one-zero-eight"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
              >
                <span className="icon-[mdi--github] text-3xl text-inactive" />
              </a>
            </Tooltip>
            <Tooltip content="Telegram">
              <a
                href="https://t.me/one_zero_eight"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
              >
                <span className="icon-[uil--telegram-alt] text-3xl text-inactive" />
              </a>
            </Tooltip>
            <Tooltip content="YouTube">
              <a
                href="https://www.youtube.com/@one-zero-eight"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
              >
                <span className="icon-[hugeicons--youtube] text-3xl text-inactive" />
              </a>
            </Tooltip>
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
