import { CoursesTabContent } from "@/components/schedule-assistant/settings/CoursesTabContent.tsx";
import { InstructorsTabContent } from "@/components/schedule-assistant/settings/InstructorsTabContent.tsx";
import { RoomsTabContent } from "@/components/schedule-assistant/settings/RoomsTabContent.tsx";
import { SemesterTabContent } from "@/components/schedule-assistant/settings/SemesterTabContent.tsx";
import { SettingsSidebar } from "@/components/schedule-assistant/settings/SettingsSidebar.tsx";
import { StudentsGroupsTabContent } from "@/components/schedule-assistant/settings/StudentsGroupsTabContent.tsx";
import { isSettingsSelectionValid } from "@/components/schedule-assistant/settings/groupsSelection.ts";
import {
  ConfigProvider,
  useConfig,
  useConfigState,
} from "@/components/schedule-assistant/settings/useConfig.tsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import {
  SelectionProvider,
  useSelection,
  useSelectionState,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect } from "react";

const settingsRouteApi = getRouteApi(
  "/schedule-assistant/settings/$settingsTab",
);

export function SettingsWorkspace() {
  const { settingsTab } = settingsRouteApi.useParams();
  const routeSettingsSubTab = settingsTab as SettingsSubTab;
  const configStore = useConfigState();
  const selectionStore = useSelectionState(routeSettingsSubTab);

  return (
    <ConfigProvider value={configStore}>
      <SelectionProvider value={selectionStore}>
        <SettingsWorkspaceInner />
      </SelectionProvider>
    </ConfigProvider>
  );
}

function SettingsWorkspaceInner() {
  const navigate = useNavigate();
  const { settingsTab } = settingsRouteApi.useParams();
  const routeSettingsSubTab = settingsTab as SettingsSubTab;
  const { configData, addProgram, addRoom, addCourse, addInstructor } =
    useConfig();
  const {
    settingsSubTab,
    setSettingsSubTab,
    setSettingsSelectionByTab,
    clearAllSelection,
  } = useSelection();

  useEffect(() => {
    if (settingsSubTab === routeSettingsSubTab) return;
    setSettingsSubTab(routeSettingsSubTab);
  }, [routeSettingsSubTab, settingsSubTab, setSettingsSubTab]);

  useEffect(() => {
    setSettingsSelectionByTab((prev) => {
      const current = prev[settingsSubTab];
      if (!current) return prev;
      if (isSettingsSelectionValid(configData, settingsSubTab, current))
        return prev;
      return {
        ...prev,
        [settingsSubTab]: null,
      };
    });
  }, [configData, settingsSubTab, setSettingsSelectionByTab]);

  useEffect(() => {
    function handleGlobalEsc(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        active.blur();
        event.preventDefault();
        return;
      }
      clearAllSelection();
    }

    window.addEventListener("keydown", handleGlobalEsc);
    return () => window.removeEventListener("keydown", handleGlobalEsc);
  }, [clearAllSelection]);

  function handleNavigateToSettingsTab(tab: SettingsSubTab) {
    navigate({
      to: "/schedule-assistant/settings/$settingsTab",
      params: { settingsTab: tab },
    });
  }

  return (
    <div className="flex w-full flex-col gap-3 p-4">
      <div className="grid h-full min-h-0 w-full flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="xl:col-start-1 xl:row-start-1">
          <div className="tabs tabs-box bg-base-200 h-auto w-full shrink-0 flex-wrap justify-start gap-1 p-1">
            <button
              type="button"
              className={clsx(
                "tab rounded-btn",
                settingsSubTab === "courses" ? "tab-active" : "",
              )}
              onClick={() => handleNavigateToSettingsTab("courses")}
            >
              Курсы
            </button>
            <button
              type="button"
              className={clsx(
                "tab rounded-btn",
                settingsSubTab === "groups" ? "tab-active" : "",
              )}
              onClick={() => handleNavigateToSettingsTab("groups")}
            >
              Программы и Группы
            </button>
            <button
              type="button"
              className={clsx(
                "tab rounded-btn",
                settingsSubTab === "instructors" ? "tab-active" : "",
              )}
              onClick={() => handleNavigateToSettingsTab("instructors")}
            >
              Преподаватели
            </button>
            <button
              type="button"
              className={clsx(
                "tab rounded-btn",
                settingsSubTab === "rooms" ? "tab-active" : "",
              )}
              onClick={() => handleNavigateToSettingsTab("rooms")}
            >
              Аудитории
            </button>
            <button
              type="button"
              className={clsx(
                "tab rounded-btn",
                settingsSubTab === "semester" ? "tab-active" : "",
              )}
              onClick={() => handleNavigateToSettingsTab("semester")}
            >
              Семестр и общие параметры
            </button>
          </div>
        </div>

        <div className="border-base-300 bg-base-100 rounded-box min-h-0 border p-3 xl:col-start-1 xl:row-start-2">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {settingsSubTab === "groups" ? (
                <StudentsGroupsTabContent onAddProgram={addProgram} />
              ) : settingsSubTab === "courses" ? (
                <CoursesTabContent onAddCourse={addCourse} />
              ) : settingsSubTab === "rooms" ? (
                <RoomsTabContent onAddRoom={addRoom} />
              ) : settingsSubTab === "instructors" ? (
                <InstructorsTabContent onAddInstructor={addInstructor} />
              ) : settingsSubTab === "semester" ? (
                <SemesterTabContent />
              ) : null}
            </div>
          </div>
        </div>

        <aside className="border-base-300 bg-base-100 rounded-box sticky top-4 flex max-h-[calc(100vh-2rem)] min-h-0 w-full flex-col self-start overflow-hidden border p-3 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-[calc(100vh-2rem)]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <SettingsSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}
