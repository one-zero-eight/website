import Tooltip from "@/components/common/Tooltip";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const menuItems = [
  {
    to: "/schedule-assistant/timetable",
    label: "Таблица",
    icon: "icon-[mdi--table]",
  },
  {
    to: "/schedule-assistant/settings",
    label: "Настройки",
    icon: "icon-[mdi--cog-outline]",
  },
  {
    to: "/schedule-assistant/checks",
    label: "Проверка",
    icon: "icon-[mdi--clipboard-check-outline]",
  },
  {
    to: "/schedule-assistant/bookings",
    label: "Бронирование",
    icon: "icon-[mdi--door-open]",
  },
] as const;

export function MainFloatingMenu() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 flex justify-start sm:left-5">
      <div className="tabs tabs-box border-base-300 bg-base-100/95 rounded-box pointer-events-auto flex-nowrap text-sm font-medium shadow-[0_14px_48px_-8px_rgba(15,23,42,0.35),0_8px_28px_-10px_rgba(15,23,42,0.22),0_4px_14px_-4px_rgba(15,23,42,0.14),0_1px_3px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        {menuItems.map(({ to, label, icon }) => (
          <Tooltip
            key={to}
            content={isCollapsed ? label : undefined}
            openDelay={800}
          >
            <Link
              to={to}
              className={cn("tab", isCollapsed ? "w-10 px-0" : "px-2 sm:px-4")}
              activeProps={{ className: "tab-active" }}
            >
              {isCollapsed ? <span className={cn(icon, "text-xl")} /> : label}
            </Link>
          </Tooltip>
        ))}
        <Tooltip
          content={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
          openDelay={800}
        >
          <button
            type="button"
            className="flex h-10 w-6 shrink-0 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-black"
            onClick={() => setIsCollapsed((previous) => !previous)}
          >
            <span
              className={cn(
                "text-xl",
                isCollapsed
                  ? "icon-[mdi--chevron-right]"
                  : "icon-[mdi--chevron-left]",
              )}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
