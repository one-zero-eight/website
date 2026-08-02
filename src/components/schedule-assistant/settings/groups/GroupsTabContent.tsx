import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import type { ProgramTreeProgram } from "@/components/schedule-assistant/settings/groups/programsGroupsTreeView.ts";
import {
  buildProgramsGroupsTreeView,
  buildProgramsGroupsTreeViewSectionTabs,
} from "@/components/schedule-assistant/settings/groups/programsGroupsTreeView.ts";
import { SectionTabsBar } from "@/components/schedule-assistant/settings/SectionTabsBar.tsx";
import {
  SchemaSectionProgram,
  SectionProgramKindAnyOf0,
  SectionProgramLanguageAnyOf0,
} from "@/api/schedule-assistant/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useAddProgramToSection,
  useConfig,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  SettingsCreateField,
  SettingsCreateModal,
} from "@/components/schedule-assistant/settings/SettingsCreateModal.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
} from "@/components/schedule-assistant/settings/useSelection.tsx";

const STUDENT_GROUPS_SUBTAB_STORAGE_KEY =
  "schedule-assistant:settings:groups-subtab";

const PROGRAM_KIND_OPTIONS = [
  { value: SectionProgramKindAnyOf0.degree_year, label: "degree_year" },
  { value: SectionProgramKindAnyOf0.english_program, label: "english_program" },
  {
    value: SectionProgramKindAnyOf0.elective_bucket,
    label: "elective_bucket",
  },
] as const;

export function GroupsTabContent() {
  const { config, isPending, isError, error } = useConfig();
  const { selectedSelectionId, selectItem } = useSelection();
  const programsGroupsTreeView = useMemo(
    () => buildProgramsGroupsTreeView(config),
    [config],
  );
  const programSections = useMemo(
    () => buildProgramsGroupsTreeViewSectionTabs(config),
    [config],
  );
  const sections = programSections;
  const sectionMeta = useMemo(
    () =>
      sections.map((section) => ({
        key: section.code,
        label: section.name,
      })),
    [sections],
  );
  const sectionPrograms = useMemo(() => {
    const result: Record<string, ProgramTreeProgram[]> = {};
    const programsByCode = new Map<string, ProgramTreeProgram[]>();
    for (const program of programsGroupsTreeView) {
      const key = String(program.code || "").trim();
      if (!key) continue;
      programsByCode.set(key, [...(programsByCode.get(key) || []), program]);
    }
    for (const section of sections) {
      const programsForSection: ProgramTreeProgram[] = [];
      for (const code of section.programCodes) {
        programsForSection.push(...(programsByCode.get(code) || []));
      }
      result[section.code] = programsForSection;
    }
    return result;
  }, [programsGroupsTreeView, sections]);
  const [activeSectionKey, setActiveSectionKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STUDENT_GROUPS_SUBTAB_STORAGE_KEY) || "";
  });

  useEffect(() => {
    if (!sectionMeta.length) return;
    if (
      activeSectionKey &&
      sectionMeta.some((section) => section.key === activeSectionKey)
    )
      return;
    setActiveSectionKey(sectionMeta[0].key);
  }, [activeSectionKey, sectionMeta]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeSectionKey) return;
    window.localStorage.setItem(
      STUDENT_GROUPS_SUBTAB_STORAGE_KEY,
      activeSectionKey,
    );
  }, [activeSectionKey]);

  const { addProgram, isPending: isAddingProgram } = useAddProgramToSection();
  const [createOpen, setCreateOpen] = useState(false);
  const [createSectionCode, setCreateSectionCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<string>(
    SectionProgramKindAnyOf0.degree_year,
  );
  const [newDegree, setNewDegree] = useState("");
  const [newLanguage, setNewLanguage] = useState<string>(
    SectionProgramLanguageAnyOf0.en,
  );
  const [pendingCreatedProgram, setPendingCreatedProgram] = useState<{
    sectionCode: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    if (!pendingCreatedProgram) return;
    if (activeSectionKey !== pendingCreatedProgram.sectionCode) {
      setActiveSectionKey(pendingCreatedProgram.sectionCode);
      return;
    }
    const programs = sectionPrograms[pendingCreatedProgram.sectionCode] ?? [];
    const match = programs.find(
      (program) => String(program.code ?? "") === pendingCreatedProgram.code,
    );
    if (!match) return;
    selectItem(match.selection);
    setPendingCreatedProgram(null);
  }, [activeSectionKey, pendingCreatedProgram, sectionPrograms, selectItem]);

  function resetCreateForm(sectionCode = activeSectionKey) {
    setCreateSectionCode(sectionCode);
    setNewCode("");
    setNewName("");
    setNewKind(SectionProgramKindAnyOf0.degree_year);
    setNewDegree("");
    setNewLanguage(SectionProgramLanguageAnyOf0.en);
  }

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

  if (!programsGroupsTreeView.length) {
    return (
      <div className="text-base-content/70 text-sm">
        Нет групп в конфигурации.
      </div>
    );
  }
  if (!sectionMeta.length) {
    return (
      <div className="text-base-content/70 text-sm">
        В конфигурации отсутствуют sections для табов групп.
      </div>
    );
  }

  const activePrograms = sectionPrograms[activeSectionKey] || [];

  function handleCreateProgram() {
    const sectionCode = createSectionCode.trim() || activeSectionKey;
    const code = newCode.trim();
    const name = newName.trim();
    if (!sectionCode || !code || !name) return;
    addProgram(
      sectionCode,
      {
        code,
        name,
        kind: newKind.trim() || null,
        degree: newDegree.trim() || null,
        language:
          newLanguage === SectionProgramLanguageAnyOf0.ru
            ? SectionProgramLanguageAnyOf0.ru
            : newLanguage === SectionProgramLanguageAnyOf0.en
              ? SectionProgramLanguageAnyOf0.en
              : null,
        year: null,
        applies_to: [],
        tracks: [],
        groups: [],
      } satisfies SchemaSectionProgram,
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetCreateForm(sectionCode);
          setPendingCreatedProgram({ sectionCode, code });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <SectionTabsBar
        tabs={sectionMeta}
        activeKey={activeSectionKey}
        onChange={setActiveSectionKey}
      />
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm w-fit shrink-0"
        onClick={() => {
          resetCreateForm(activeSectionKey);
          setCreateOpen(true);
        }}
      >
        Добавить программу
      </button>
      {activePrograms.map((program) => (
        <section key={program.key} className="flex flex-col gap-2">
          <button
            type="button"
            className={clsx(
              "inline-flex w-fit max-w-full min-w-0 flex-row items-center justify-between gap-2 self-start overflow-hidden rounded-lg px-3 py-1.5 text-left text-sm font-semibold transition-colors",
              selectedSelectionId === getSettingsSelectionKey(program.selection)
                ? "bg-primary/12 text-base-content ring-primary ring-2 ring-inset"
                : "text-base-content/65 hover:bg-base-200/80",
            )}
            onClick={() => selectItem(program.selection)}
          >
            <span className="min-w-0 truncate">{program.title}</span>
            <span className="icon-[material-symbols--edit-outline-rounded] text-base-content/45 pointer-events-none shrink-0 text-lg" />
          </button>
          {program.tracks.length > 0 ? (
            <div className="rounded-box border-base-content/15 overflow-hidden border">
              {program.tracks.map((track, trackIndex) => {
                const trackBlockHighlighted =
                  selectedSelectionId ===
                    getSettingsSelectionKey(track.selection) ||
                  selectedSelectionId ===
                    getSettingsSelectionKey(program.selection);
                const isFirstTrack = trackIndex === 0;
                const isLastTrack = trackIndex === program.tracks.length - 1;
                return (
                  <div
                    key={track.key}
                    className={clsx(
                      "flex flex-col",
                      !isFirstTrack ? "border-base-content/15 border-t" : "",
                      trackBlockHighlighted
                        ? "bg-primary/8 ring-primary ring-2 ring-inset"
                        : "",
                      trackBlockHighlighted && isFirstTrack && isLastTrack
                        ? "rounded-box"
                        : "",
                      trackBlockHighlighted && isFirstTrack && !isLastTrack
                        ? "rounded-t-box"
                        : "",
                      trackBlockHighlighted && !isFirstTrack && isLastTrack
                        ? "rounded-b-box"
                        : "",
                    )}
                  >
                    <button
                      type="button"
                      className={clsx(
                        "btn inline-flex w-full flex-row items-center justify-start gap-1 overflow-hidden border-0 px-3 text-left",
                        isFirstTrack && isLastTrack && !track.groups.length
                          ? "rounded-box"
                          : clsx(
                              isFirstTrack
                                ? "rounded-t-box rounded-b-none"
                                : "",
                              !isFirstTrack &&
                                isLastTrack &&
                                !track.groups.length
                                ? "rounded-b-box"
                                : "",
                              !isFirstTrack &&
                                !(isLastTrack && !track.groups.length)
                                ? "rounded-none"
                                : "",
                            ),
                        trackBlockHighlighted
                          ? "bg-primary/18 hover:bg-primary/20"
                          : "",
                      )}
                      onClick={() => selectItem(track.selection)}
                    >
                      <span className="max-w-[calc(100%-1.625rem)] min-w-0 truncate text-sm font-medium">
                        {track.name}
                      </span>
                      <span className="icon-[material-symbols--edit-outline-rounded] text-base-content/45 pointer-events-none shrink-0 text-lg" />
                    </button>
                    {track.groups.map((group, groupRenderIndex) => {
                      const est = group.estimatedSize;
                      const stu = group.studentsCount;
                      const metricsEqual =
                        (est == null && stu == null) ||
                        (est != null &&
                          stu != null &&
                          String(est) === String(stu));
                      const sharedDisplay = est ?? stu ?? "?";
                      const isLastGroupInTrack =
                        groupRenderIndex === track.groups.length - 1;
                      const roundGroupBottom =
                        isLastTrack && isLastGroupInTrack;
                      const groupOnlySelected =
                        selectedSelectionId ===
                        getSettingsSelectionKey(group.selection);

                      return (
                        <button
                          key={group.key}
                          type="button"
                          className={clsx(
                            "btn btn-ghost border-base-content/15 w-full rounded-none border-x-0 border-t border-b-0 pr-3 pl-6 text-left",
                            !groupOnlySelected && roundGroupBottom
                              ? "rounded-b-box"
                              : "",
                            groupOnlySelected
                              ? clsx(
                                  "btn-active bg-primary/12 ring-primary ring-2 ring-inset",
                                  roundGroupBottom ? "rounded-b-box" : "",
                                )
                              : clsx(
                                  "bg-transparent",
                                  trackBlockHighlighted
                                    ? "hover:bg-primary/14"
                                    : "hover:bg-base-200/60",
                                ),
                          )}
                          onClick={() => selectItem(group.selection)}
                        >
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {group.groupLabel}
                              </div>
                              {group.groupId !== group.groupLabel ? (
                                <div className="text-base-content/60 mt-0.5 truncate text-xs">
                                  {group.groupId}
                                </div>
                              ) : null}
                            </div>
                            {metricsEqual ? (
                              <div className="text-base-content/60 flex shrink-0 items-center justify-end gap-1.5 text-xs tabular-nums">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className="icon-[material-symbols--straighten-outline-rounded] inline-block shrink-0 text-sm leading-none"
                                    title="Предположительный размер"
                                  />
                                  <span
                                    className="icon-[material-symbols--groups-outline-rounded] inline-block shrink-0 text-sm leading-none"
                                    title="Студентов"
                                  />
                                </div>
                                <span title="Предположительный размер и число студентов совпадают">
                                  {sharedDisplay}
                                </span>
                              </div>
                            ) : (
                              <div className="text-base-content/60 flex shrink-0 flex-col items-end gap-0.5 text-xs tabular-nums">
                                <span
                                  className="inline-flex items-center gap-1.5"
                                  title="Предположительный размер"
                                >
                                  <span className="icon-[material-symbols--straighten-outline-rounded] shrink-0 text-sm leading-none" />
                                  <span>{est ?? "?"}</span>
                                </span>
                                <span
                                  className="inline-flex items-center gap-1.5"
                                  title="Студентов"
                                >
                                  <span className="icon-[material-symbols--groups-outline-rounded] shrink-0 text-sm leading-none" />
                                  <span>{stu ?? "—"}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ))}
      <SettingsCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новая программа"
        submitLabel="Создать"
        isPending={isAddingProgram}
        onSubmit={handleCreateProgram}
      >
        <SettingsCreateField label="Секция" required>
          <select
            className="select select-bordered select-sm w-full"
            value={createSectionCode}
            required
            onChange={(e) => setCreateSectionCode(e.target.value)}
          >
            {sectionMeta.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
        </SettingsCreateField>
        <SettingsCreateField label="Код" required>
          <input
            className="input input-bordered input-sm w-full"
            value={newCode}
            required
            placeholder="BS_Y1_EN"
            onChange={(e) => setNewCode(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Название" required>
          <input
            className="input input-bordered input-sm w-full"
            value={newName}
            required
            placeholder="BS - Year 1 (EN)"
            onChange={(e) => setNewName(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Тип">
          <select
            className="select select-bordered select-sm w-full"
            value={newKind}
            onChange={(e) => setNewKind(e.target.value)}
          >
            {PROGRAM_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsCreateField>
        <SettingsCreateField label="Степень">
          <input
            className="input input-bordered input-sm w-full"
            value={newDegree}
            placeholder="bs / ms / phd"
            onChange={(e) => setNewDegree(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Язык">
          <select
            className="select select-bordered select-sm w-full"
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
          >
            <option value={SectionProgramLanguageAnyOf0.en}>en</option>
            <option value={SectionProgramLanguageAnyOf0.ru}>ru</option>
          </select>
        </SettingsCreateField>
      </SettingsCreateModal>
    </div>
  );
}
