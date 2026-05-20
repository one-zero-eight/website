import { TimetableWorkspace } from "@/components/schedule-assistant/timetable/TimetableWorkspace.tsx";
import clsx from "clsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import { useNavigate } from "@tanstack/react-router";
import { SettingsWorkspace } from "@/components/schedule-assistant/settings/SettingsWorkspace.tsx";

export type MainTab = "timetable" | "settings" | "checks";

export function ScheduleAssistantPage({
  tab,
  settingsSubTab,
}: {
  tab: MainTab;
  settingsSubTab: SettingsSubTab;
}) {
  const navigate = useNavigate();

  return (
    <div
      data-theme="light"
      className="font-rubik flex h-screen w-full flex-col text-base leading-normal antialiased [&_.tab]:select-text [&_button]:select-text [&_summary]:select-text"
    >
      <div
        className={clsx(
          "bg-base-200/40 relative flex min-h-0 flex-1 flex-col",
          tab === "timetable" ? "overflow-hidden" : "overflow-auto pb-32",
        )}
      >
        {tab === "settings" && <SettingsWorkspace />}

        {tab === "checks" && <div className="flex w-full flex-1" />}

        {tab === "timetable" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TimetableWorkspace />
          </div>
        )}

        <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex justify-start">
          <div className="tabs tabs-box border-base-300 bg-base-100/95 rounded-box pointer-events-auto text-sm font-medium shadow-[0_14px_48px_-8px_rgba(15,23,42,0.35),0_8px_28px_-10px_rgba(15,23,42,0.22),0_4px_14px_-4px_rgba(15,23,42,0.14),0_1px_3px_rgba(15,23,42,0.1)] backdrop-blur-sm">
            <button
              type="button"
              className={`tab ${tab === "timetable" ? "tab-active" : ""}`}
              onClick={() => {
                navigate({
                  to: "/schedule-assistant/timetable",
                });
              }}
            >
              Таблица
            </button>
            <button
              type="button"
              className={`tab ${tab === "settings" ? "tab-active" : ""}`}
              onClick={() => {
                navigate({
                  to: "/schedule-assistant/settings/$settingsTab",
                  params: { settingsTab: settingsSubTab },
                });
              }}
            >
              Настройки
            </button>
            <button
              type="button"
              className={`tab ${tab === "checks" ? "tab-active" : ""}`}
              onClick={() => {
                navigate({
                  to: "/schedule-assistant/checks",
                });
              }}
            >
              Проверка
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
