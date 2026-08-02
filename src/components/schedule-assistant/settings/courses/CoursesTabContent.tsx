import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudienceTreeInfoIcon } from "./audienceTreeTooltip.tsx";
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

function CourseRowButton({
  course,
  selected,
  isLast,
  indentClass,
  onSelect,
}: {
  course: CourseUsageRow;
  selected: boolean;
  isLast: boolean;
  indentClass: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "border-base-300 flex w-full items-center justify-between gap-3 border-t py-1 text-left",
        indentClass,
        isLast ? "rounded-b-box" : "",
        selected
          ? "bg-primary/12 ring-primary ring-2 ring-inset"
          : "hover:bg-base-200/60",
      )}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="truncate text-sm leading-tight font-medium">
          {course.title}
        </div>
        <div className="text-base-content/60 truncate text-xs leading-tight">
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
  const sections = useMemo(() => buildCoursesTabSections(config), [config]);
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

  if (!config || !sections.length) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-base-content/70 text-sm">
          В конфигурации отсутствуют sections для табов курсов.
        </div>
        {createButton}
        {createModal}
      </div>
    );
  }

  const activeSection =
    sections.find((section) => section.key === activeSectionKey) || null;
  const programs = activeSection?.programs || [];
  const tabs = sections.map((section) => ({
    key: section.key,
    label: section.title,
  }));

  return (
    <div className="flex flex-col gap-4">
      <SectionTabsBar
        tabs={tabs}
        activeKey={activeSectionKey}
        onChange={setActiveSectionKey}
        trailing={<NewSectionButton onCreated={setActiveSectionKey} />}
      />
      <div className="flex flex-col gap-6">
        {!programs.length ? (
          <div className="text-base-content/70 text-sm">
            В этом разделе нет курсов.
          </div>
        ) : null}
        {programs.map((program) => {
          const hasBody =
            program.sharedCourses.length > 0 || program.tracks.length > 0;
          const programSelector =
            program.key !== "unassigned" ? `@${program.key}` : null;
          const hasTracksAfterShared = program.tracks.length > 0;
          return (
            <div
              key={program.key}
              className="border-base-300 rounded-box overflow-hidden border"
            >
              <div
                className={clsx(
                  "border-base-300 bg-base-200/70 flex items-center gap-1 px-3 py-2 text-sm font-semibold",
                  hasBody ? "border-b" : "",
                  hasBody ? "rounded-t-box" : "rounded-box",
                )}
              >
                <span className="min-w-0 truncate">{program.title}</span>
                {programSelector ? (
                  <AudienceTreeInfoIcon
                    config={config}
                    selector={programSelector}
                    mode="program"
                  />
                ) : null}
              </div>
              {hasBody ? (
                <div className="divide-base-300 divide-y">
                  {program.sharedCourses.length > 0 ? (
                    <div>
                      {program.hasExplicitTracks ? (
                        <div className="bg-base-200/30 flex items-center gap-1 px-3 py-1.5 text-sm font-medium">
                          <span>Общие</span>
                          {programSelector ? (
                            <AudienceTreeInfoIcon
                              config={config}
                              selector={programSelector}
                              mode="shared"
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {program.sharedCourses.map((course, courseIndex) => {
                        const isLastCourse =
                          !hasTracksAfterShared &&
                          courseIndex === program.sharedCourses.length - 1;
                        return (
                          <CourseRowButton
                            key={`${program.key}-shared-${course.id}`}
                            course={course}
                            selected={
                              selectedSelectionId ===
                              getSettingsSelectionKey(course.selection)
                            }
                            isLast={isLastCourse}
                            indentClass={
                              program.hasExplicitTracks
                                ? "px-3 pl-6"
                                : "px-3 py-1"
                            }
                            onSelect={() => selectItem(course.selection)}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                  {program.tracks.map((track, trackIndex) => {
                    const isLastTrack =
                      trackIndex === program.tracks.length - 1;
                    const trackSelector =
                      program.key !== "unassigned"
                        ? `@${program.key}/${track.title}`
                        : null;
                    const trackHasContent =
                      track.courses.length > 0 || track.groups.length > 0;

                    return (
                      <div key={track.key}>
                        <div
                          className={clsx(
                            "bg-base-200/30 flex items-center gap-1 px-3 py-1.5 text-sm font-medium",
                            isLastTrack && !trackHasContent
                              ? "rounded-b-box"
                              : "",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            {track.title}
                          </span>
                          {trackSelector ? (
                            <AudienceTreeInfoIcon
                              config={config}
                              selector={trackSelector}
                              mode="track"
                            />
                          ) : null}
                        </div>
                        {track.courses.map((course, courseIndex) => {
                          const isLastCourse =
                            isLastTrack &&
                            track.groups.length === 0 &&
                            courseIndex === track.courses.length - 1;
                          return (
                            <CourseRowButton
                              key={`${track.key}-${course.id}`}
                              course={course}
                              selected={
                                selectedSelectionId ===
                                getSettingsSelectionKey(course.selection)
                              }
                              isLast={isLastCourse}
                              indentClass="px-3 pl-6"
                              onSelect={() => selectItem(course.selection)}
                            />
                          );
                        })}
                        {track.groups.map((groupBucket, groupIndex) => {
                          const isLastGroup =
                            isLastTrack &&
                            groupIndex === track.groups.length - 1;
                          return (
                            <div key={groupBucket.key}>
                              <div
                                className={clsx(
                                  "border-base-300 text-base-content/80 border-t px-3 py-1 pl-6 text-sm font-medium",
                                  isLastGroup &&
                                    groupBucket.courses.length === 0
                                    ? "rounded-b-box"
                                    : "",
                                )}
                              >
                                {groupBucket.title}
                              </div>
                              {groupBucket.courses.map(
                                (course, courseIndex) => {
                                  const isLastCourse =
                                    isLastGroup &&
                                    courseIndex ===
                                      groupBucket.courses.length - 1;
                                  return (
                                    <CourseRowButton
                                      key={`${groupBucket.key}-${course.id}`}
                                      course={course}
                                      selected={
                                        selectedSelectionId ===
                                        getSettingsSelectionKey(
                                          course.selection,
                                        )
                                      }
                                      isLast={isLastCourse}
                                      indentClass="px-3 pl-9"
                                      onSelect={() =>
                                        selectItem(course.selection)
                                      }
                                    />
                                  );
                                },
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {createButton}
        {createModal}
      </div>
    </div>
  );
}
