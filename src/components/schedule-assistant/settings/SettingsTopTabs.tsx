import { SettingsSaveStatusIndicator } from "@/components/schedule-assistant/settings/settingsSaveStatus.tsx";
import { Link } from "@tanstack/react-router";

export function SettingsTopTabs() {
  return (
    <div className="border-base-300 bg-base-200 rounded-box flex w-full shrink-0 items-center gap-2 border p-1">
      <div className="tabs tabs-box bg-base-200 h-auto min-w-0 flex-1 flex-wrap justify-start gap-1 p-0">
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
      <SettingsSaveStatusIndicator />
    </div>
  );
}
