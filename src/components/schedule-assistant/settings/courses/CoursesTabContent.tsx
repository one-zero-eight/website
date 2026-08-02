import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildCoursesTabSections,
  type CourseUsageRow,
} from "./coursesTabSections.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { SectionTabsBar } from "@/components/schedule-assistant/settings/SectionTabsBar.tsx";
import { NewSectionButton } from "@/components/schedule-assistant/settings/NewSectionButton.tsx";
import {
  SettingsCreateField,
  SettingsCreateModal,
} from "@/components/schedule-assistant/settings/SettingsCreateModal.tsx";
import {
  useConfig,
  useCreateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { usePendingSettingsSelect } from "@/components/schedule-assistant/settings/usePendingSettingsSelect.ts";
import {
  getSettingsSelectionKey,
  useSelection,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import type { SchemaCourseConfig } from "@/api/schedule-assistant/types.ts";

const COURSES_SUBTAB_STORAGE_KEY = "schedule-assistant:settings:courses-subtab";

function CourseCard({
  course,
  selectedSelectionId,
  onSelect,
}: {
  course: CourseUsageRow;
  selectedSelectionId: string | null;
  onSelect: (selection: CourseUsageRow["selection"]) => void;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "btn btn-ghost rounded-box h-auto min-h-0 w-full justify-start border px-3 py-2 text-left normal-case",
        "border-base-300 hover:bg-base-200",
        selectedSelectionId === getSettingsSelectionKey(course.selection)
          ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
          : "bg-base-100",
      )}
      onClick={() => onSelect(course.selection)}
    >
      <div className="w-full text-left">
        <div className="text-sm font-semibold">{course.title}</div>
        <div className="text-base-content/70 text-xs">
          Компоненты: {course.subtitle ?? "—"}
        </div>
      </div>
    </button>
  );
}

export function CoursesTabContent() {
  const { config, isPending, isError, error } = useConfig();
  const { mutate: createCourse, isPending: isCreating } =
    useCreateCourseMutation();
  const { selectedSelectionId, selectItem } = useSelection();
  const { sections, unassigned } = useMemo(
    () => buildCoursesTabSections(config),
    [config],
  );
  const [activeSectionKey, setActiveSectionKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(COURSES_SUBTAB_STORAGE_KEY) || "";
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [newNameRu, setNewNameRu] = useState("");
  const [newShortNameRu, setNewShortNameRu] = useState("");
  const [newTags, setNewTags] = useState("");
  const courses = config?.courses;
  const handleSelectCourse = useCallback(
    (courseIndex: number) => {
      selectItem({ kind: "course", courseIndex });
    },
    [selectItem],
  );
  const findCourseIndexByName = useCallback(
    (items: SchemaCourseConfig[], key: string) =>
      items.findIndex((item) => String(item.name ?? "") === key),
    [],
  );
  const requestSelectCreatedCourse = usePendingSettingsSelect(
    courses,
    findCourseIndexByName,
    handleSelectCourse,
  );

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

  function resetCreateForm() {
    setNewName("");
    setNewShortName("");
    setNewNameRu("");
    setNewShortNameRu("");
    setNewTags("");
  }

  function handleCreateCourse() {
    const name = newName.trim();
    if (!name) return;
    createCourse(
      {
        body: {
          name,
          short_name: newShortName.trim() || null,
          name_ru: newNameRu.trim() || null,
          short_name_ru: newShortNameRu.trim() || null,
          course_tags: newTags
            .split(",")
            .map((chunk) => chunk.trim())
            .filter(Boolean),
          components: [],
        },
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetCreateForm();
          requestSelectCreatedCourse(name);
        },
      },
    );
  }

  const createButton = (
    <button
      type="button"
      className="btn btn-outline btn-secondary btn-sm w-fit shrink-0"
      onClick={() => {
        resetCreateForm();
        setNewName("Новый курс");
        setCreateOpen(true);
      }}
    >
      Добавить курс
    </button>
  );

  const unassignedList =
    unassigned.length > 0 ? (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {unassigned.map((course) => (
          <CourseCard
            key={`unassigned-${course.id}`}
            course={course}
            selectedSelectionId={selectedSelectionId}
            onSelect={selectItem}
          />
        ))}
      </div>
    ) : null;

  const createModal = (
    <SettingsCreateModal
      open={createOpen}
      onOpenChange={setCreateOpen}
      title="Новый курс"
      submitLabel="Создать"
      isPending={isCreating}
      onSubmit={handleCreateCourse}
    >
      <SettingsCreateField label="Название" required>
        <input
          className="input input-bordered input-sm w-full"
          value={newName}
          required
          onChange={(e) => setNewName(e.target.value)}
        />
      </SettingsCreateField>
      <SettingsCreateField label="Короткое название (EN)">
        <input
          className="input input-bordered input-sm w-full"
          value={newShortName}
          onChange={(e) => setNewShortName(e.target.value)}
        />
      </SettingsCreateField>
      <SettingsCreateField label="Название (RU)">
        <input
          className="input input-bordered input-sm w-full"
          value={newNameRu}
          onChange={(e) => setNewNameRu(e.target.value)}
        />
      </SettingsCreateField>
      <SettingsCreateField label="Короткое название (RU)">
        <input
          className="input input-bordered input-sm w-full"
          value={newShortNameRu}
          onChange={(e) => setNewShortNameRu(e.target.value)}
        />
      </SettingsCreateField>
      <SettingsCreateField label="Теги курса (через запятую)">
        <input
          className="input input-bordered input-sm w-full"
          value={newTags}
          placeholder="core_course, elective, english"
          onChange={(e) => setNewTags(e.target.value)}
        />
      </SettingsCreateField>
    </SettingsCreateModal>
  );

  if (isPending) {
    return <div className="skeleton h-40 w-full" />;
  }

  if (isError) {
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-base-content/70 text-sm">
          В конфигурации отсутствуют sections для табов курсов.
        </div>
        {createButton}
        {unassignedList}
        {createModal}
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
        trailing={<NewSectionButton onCreated={setActiveSectionKey} />}
      />
      {createButton}
      {unassignedList}
      {!groups.length && !unassigned.length ? (
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
                    <CourseCard
                      key={`${track.key}-${course.id}`}
                      course={course}
                      selectedSelectionId={selectedSelectionId}
                      onSelect={selectItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {createModal}
    </div>
  );
}
