import { CoursesTabContent } from "@/components/schedule-assistant/settings/courses/CoursesTabContent.tsx";
import { isSettingsSelectionValid } from "@/components/schedule-assistant/settings/groups/groupsSelection.ts";
import { InstructorsTabContent } from "@/components/schedule-assistant/settings/instructors/InstructorsTabContent.tsx";
import { RoomsTabContent } from "@/components/schedule-assistant/settings/rooms/RoomsTabContent.tsx";
import { SemesterTabContent } from "@/components/schedule-assistant/settings/semester/SemesterTabContent.tsx";
import { SettingsSidebar } from "@/components/schedule-assistant/settings/SettingsSidebar.tsx";
import { SettingsTopTabs } from "@/components/schedule-assistant/settings/SettingsTopTabs.tsx";
import { GroupsTabContent } from "@/components/schedule-assistant/settings/groups/GroupsTabContent.tsx";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import type { SettingsSubTab } from "@/components/schedule-assistant/settings/useSelection.tsx";
import {
  SelectionProvider,
  useSelection,
  useSelectionState,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import { useEffect } from "react";

export function SettingsWorkspace({
  settingsTab,
}: {
  settingsTab: SettingsSubTab;
}) {
  const selectionStore = useSelectionState(settingsTab);

  return (
    <SelectionProvider value={selectionStore}>
      <SettingsWorkspaceInner settingsTab={settingsTab} />
    </SelectionProvider>
  );
}

function SettingsWorkspaceInner({
  settingsTab: routeSettingsSubTab,
}: {
  settingsTab: SettingsSubTab;
}) {
  const { config } = useConfig();
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
      if (isSettingsSelectionValid(config, settingsSubTab, current))
        return prev;
      return {
        ...prev,
        [settingsSubTab]: null,
      };
    });
  }, [config, settingsSubTab, setSettingsSelectionByTab]);

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

  return (
    <div className="flex w-full flex-col gap-3 p-4">
      <div className="grid h-full min-h-0 w-full flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="xl:col-start-1 xl:row-start-1">
          <SettingsTopTabs />
        </div>

        <div className="border-base-300 bg-base-100 rounded-box min-h-0 border p-3 xl:col-start-1 xl:row-start-2">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {settingsSubTab === "groups" ? (
                <GroupsTabContent />
              ) : settingsSubTab === "courses" ? (
                <CoursesTabContent />
              ) : settingsSubTab === "rooms" ? (
                <RoomsTabContent />
              ) : settingsSubTab === "instructors" ? (
                <InstructorsTabContent />
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
