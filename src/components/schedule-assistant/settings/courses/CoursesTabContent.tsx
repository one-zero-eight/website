import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import { buildCoursesTabSections } from "./coursesTabSections.ts";
import { SectionTabsBar } from "@/components/schedule-assistant/settings/SectionTabsBar.tsx";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
} from "@/components/schedule-assistant/settings/useSelection.tsx";

const COURSES_SUBTAB_STORAGE_KEY = "schedule-assistant:settings:courses-subtab";

export function CoursesTabContent({
  onAddCourse,
}: {
  onAddCourse: () => void;
}) {
  const { config } = useConfig();
  const { selectedSelectionId, selectItem } = useSelection();
  const sections = useMemo(() => buildCoursesTabSections(config), [config]);
  const [activeSectionKey, setActiveSectionKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(COURSES_SUBTAB_STORAGE_KEY) || "";
  });

  useEffect(() => {
    if (!sections.length) return;
    if (
      activeSectionKey &&
      sections.some((section) => section.key === activeSectionKey)
    )
      return;
    setActiveSectionKey(sections[0].key);
  }, [activeSectionKey, sections]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeSectionKey) return;
    window.localStorage.setItem(COURSES_SUBTAB_STORAGE_KEY, activeSectionKey);
  }, [activeSectionKey]);

  if (!sections.length) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-base-content/70 text-sm">
          В конфигурации отсутствуют sections для табов курсов.
        </div>
        <button
          type="button"
          className="btn btn-outline btn-secondary btn-sm mt-1 w-fit shrink-0"
          onClick={onAddCourse}
        >
          Добавить курс
        </button>
      </div>
    );
  }

  const activeSection =
    sections.find((section) => section.key === activeSectionKey) || null;
  const groups = activeSection?.programs || [];
  const tabs = sections.map((section) => ({
    key: section.key,
    label: section.title,
  }));

  return (
    <div className="flex flex-col gap-2">
      <SectionTabsBar
        tabs={tabs}
        activeKey={activeSectionKey}
        onChange={setActiveSectionKey}
      />
      {!groups.length ? (
        <div className="text-base-content/70 text-sm">
          В этом разделе нет курсов.
        </div>
      ) : null}
      {groups.map((program) => (
        <div
          key={program.key}
          className="border-base-300 rounded-box overflow-hidden border"
        >
          <div className="bg-base-200/70 border-base-300 border-b px-3 py-2 text-sm font-semibold">
            {program.title}
          </div>
          <div className="divide-base-300 divide-y">
            {program.tracks.map((track) => (
              <div key={track.key}>
                <div className="bg-base-200/30 px-3 py-1.5 text-sm font-medium">
                  {track.title}
                </div>
                <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
                  {track.courses.map((course) => (
                    <button
                      key={`${track.key}-${course.id}`}
                      type="button"
                      className={clsx(
                        "btn btn-ghost rounded-box h-auto min-h-0 w-full justify-start border px-3 py-2 text-left normal-case",
                        "border-base-300 hover:bg-base-200",
                        selectedSelectionId ===
                          getSettingsSelectionKey(course.selection)
                          ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
                          : "bg-base-100",
                      )}
                      onClick={() => selectItem(course.selection)}
                    >
                      <div className="w-full text-left">
                        <div className="text-sm font-semibold">
                          {course.title}
                        </div>
                        <div className="text-base-content/70 text-xs">
                          Компоненты: {course.subtitle ?? "—"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm mt-1 w-fit shrink-0"
        onClick={onAddCourse}
      >
        Добавить курс
      </button>
    </div>
  );
}
