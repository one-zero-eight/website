import type { ScheduleConfigInstructor } from "@/components/schedule-assistant/settings/configTypes.ts";
import { useConfig } from "@/components/schedule-assistant/settings/useConfig.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
  type SettingsListRow,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import clsx from "clsx";
import { useMemo } from "react";

export function InstructorsTabContent({
  onAddInstructor,
}: {
  onAddInstructor: () => void;
}) {
  const { configData } = useConfig();
  const { selectedSelectionId, selectItem } = useSelection();
  const items: SettingsListRow[] = useMemo(
    () =>
      (configData?.instructors || []).map(
        (instructor: ScheduleConfigInstructor, index: number) => {
          const idStr = String(instructor?.id ?? "");
          const nameStr =
            instructor?.name != null ? String(instructor.name).trim() : "";
          const title = nameStr || idStr;
          const subtitle = nameStr ? idStr : undefined;
          return {
            id: `instructor-${index}`,
            title,
            subtitle,
            selection: { kind: "instructor", instructorIndex: index },
          };
        },
      ),
    [configData],
  );
  return (
    <div className="flex flex-col gap-2">
      {items.length ? (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(
                "btn btn-ghost rounded-box border-base-300 hover:bg-base-200 h-auto min-h-0 w-full flex-col items-start border px-3 py-2 text-left normal-case",
                selectedSelectionId === getSettingsSelectionKey(item.selection)
                  ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
                  : "bg-base-100",
              )}
              onClick={() => selectItem(item.selection)}
            >
              <span className="font-medium">{item.title}</span>
              {item.subtitle ? (
                <span className="text-base-content/70 text-xs">
                  {item.subtitle}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-base-content/70 text-sm">
          Нет преподавателей в конфигурации.
        </div>
      )}
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm mt-1 w-fit shrink-0"
        onClick={onAddInstructor}
      >
        Добавить преподавателя
      </button>
    </div>
  );
}
