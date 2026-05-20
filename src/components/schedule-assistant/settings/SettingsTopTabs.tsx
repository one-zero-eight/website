import { Link } from "@tanstack/react-router";

export function SettingsTopTabs() {
  return (
    <div className="tabs tabs-box bg-base-200 h-auto w-full shrink-0 flex-wrap justify-start gap-1 p-1">
      <Link
        to="/schedule-assistant/settings/$settingsTab"
        params={{ settingsTab: "courses" }}
        type="button"
        className="tab rounded-btn"
        activeProps={{ className: "tab-active" }}
      >
        Курсы
      </Link>
      <Link
        to="/schedule-assistant/settings/$settingsTab"
        params={{ settingsTab: "groups" }}
        className="tab rounded-btn"
        activeProps={{ className: "tab-active" }}
      >
        Программы и Группы
      </Link>
      <Link
        to="/schedule-assistant/settings/$settingsTab"
        params={{ settingsTab: "instructors" }}
        className="tab rounded-btn"
        activeProps={{ className: "tab-active" }}
      >
        Преподаватели
      </Link>
      <Link
        to="/schedule-assistant/settings/$settingsTab"
        params={{ settingsTab: "rooms" }}
        className="tab rounded-btn"
        activeProps={{ className: "tab-active" }}
      >
        Аудитории
      </Link>
      <Link
        to="/schedule-assistant/settings/$settingsTab"
        params={{ settingsTab: "semester" }}
        className="tab rounded-btn"
        activeProps={{ className: "tab-active" }}
      >
        Семестр и общие параметры
      </Link>
    </div>
  );
}
