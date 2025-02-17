import Tooltip from "@/components/common/Tooltip.tsx";
import { items } from "@/lib/links/menu-links.tsx";
import { Link, LinkOptions } from "@tanstack/react-router";
import clsx from "clsx";
import { useLocalStorage } from "usehooks-ts";
import Logo from "../icons/Logo";

export default function Sidebar() {
  const [isMinimized, setMinimized] = useLocalStorage(
    "sidebar-minimized",
    false,
  );

  return (
    <aside
      className={clsx(
        "sticky top-0 hidden h-full shrink-0 overflow-y-auto bg-floating py-4 lgw-smh:flex",
        !isMinimized ? "px-4" : "px-1",
      )}
    >
      {/* Chevron to minimize/maximize the desktop sidebar */}
      <button
        type="button"
        onClick={() => setMinimized((v) => !v)}
        className="absolute right-0 top-0 flex rounded-xl p-0.5 hover:bg-secondary"
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
        <Link to="/" className="flex place-self-center">
          <Logo className={clsx(isMinimized && "h-10 w-10")} />
        </Link>

        {items.map((item, index) =>
          item.type === "separator" ? (
            <div
              key={index}
              className="my-1 h-0.5 w-full rounded-full bg-gray-500/20"
            />
          ) : item.type === "local" ? (
            <SidebarLink
              key={index}
              title={item.title}
              badge={item.badge}
              icon={item.icon}
              to={item.to}
              isMinimized={isMinimized}
            />
          ) : (
            <SidebarLink
              key={index}
              title={item.title}
              badge={item.badge}
              icon={item.icon}
              to={item.link}
              isMinimized={isMinimized}
              external={true}
            />
          ),
        )}

        <div className="flex grow"></div>
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
  );
}

function SidebarLink({
  icon,
  title,
  badge,
  external,
  isMinimized,
  ...props
}: LinkOptions & {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  external?: boolean;
  isMinimized: boolean;
}) {
  return (
    <Link
      className={clsx(
        "flex w-full select-none rounded-xl py-1 text-inactive hover:bg-gray-500/10",
        "[&.is-active]:text-brand-violet",
        !isMinimized ? "px-2 text-4xl" : "px-1 text-3xl",
      )}
      activeProps={{ className: "is-active" }}
      {...props}
    >
      {icon}
      {!isMinimized && (
        <div className="[.is-active_&]:selected ml-4 flex w-fit items-center whitespace-nowrap text-lg font-semibold text-inactive">
          {title}
        </div>
      )}
      {!isMinimized && (!!external || !!badge) && (
        <div className="flex w-min grow items-center">
          {external && (
            <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-base" />
          )}
          {badge}
        </div>
      )}
    </Link>
  );
}
