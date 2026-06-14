import { Link } from "@tanstack/react-router";

export function MainFloatingMenu() {
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 flex justify-start">
      <div className="tabs tabs-box border-base-300 bg-base-100/95 rounded-box pointer-events-auto text-sm font-medium shadow-[0_14px_48px_-8px_rgba(15,23,42,0.35),0_8px_28px_-10px_rgba(15,23,42,0.22),0_4px_14px_-4px_rgba(15,23,42,0.14),0_1px_3px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        <Link
          to="/schedule-assistant/timetable"
          className="tab"
          activeProps={{ className: "tab-active" }}
        >
          Таблица
        </Link>
        <Link
          to="/schedule-assistant/settings"
          className="tab"
          activeProps={{ className: "tab-active" }}
        >
          Настройки
        </Link>
        <Link
          to="/schedule-assistant/checks"
          className="tab"
          activeProps={{ className: "tab-active" }}
        >
          Проверка
        </Link>
      </div>
    </div>
  );
}
