import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import type { ProgramTreeProgram } from "@/components/schedule-assistant/settings/groups/programsGroupsTreeView.ts";
import {
  buildProgramsGroupsTreeView,
  buildProgramsGroupsTreeViewSectionTabs,
} from "@/components/schedule-assistant/settings/groups/programsGroupsTreeView.ts";
import { SectionTabsBar } from "@/components/schedule-assistant/settings/SectionTabsBar.tsx";
import { NewSectionButton } from "@/components/schedule-assistant/settings/NewSectionButton.tsx";
import { ImportDistributionsModal } from "@/components/schedule-assistant/settings/groups/ImportDistributionsModal.tsx";
import {
  SchemaSectionProgram,
  SectionProgramKindAnyOf0,
  SectionProgramLanguageAnyOf0,
} from "@/api/schedule-assistant/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useAddProgramToSection,
  useConfig,
  useDeleteSection,
  useMoveProgramInSection,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  SettingsCreateField,
  SettingsCreateModal,
} from "@/components/schedule-assistant/settings/SettingsCreateModal.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
  type SettingsSelection,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import { useToast } from "@/components/toast";

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

function remapProgramIndex(
  index: number,
  fromIndex: number,
  toIndex: number,
): number {
  if (index === fromIndex) return toIndex;
  if (fromIndex < toIndex) {
    if (index > fromIndex && index <= toIndex) return index - 1;
  } else if (index >= toIndex && index < fromIndex) {
    return index + 1;
  }
  return index;
}

function remapSelectionAfterProgramMove(
  selection: SettingsSelection | null,
  sectionCode: string,
  fromIndex: number,
  toIndex: number,
): SettingsSelection | null {
  if (!selection) return selection;
  if (
    selection.kind !== "program" &&
    selection.kind !== "track" &&
    selection.kind !== "group"
  )
    return selection;
  if (selection.sectionCode !== sectionCode) return selection;
  return {
    ...selection,
    programIndex: remapProgramIndex(selection.programIndex, fromIndex, toIndex),
  };
}

export function GroupsTabContent() {
  const { config, isPending, isError, error } = useConfig();
  const { showConfirm } = useToast();
  const { selectedSelectionId, selectedSelection, selectItem, deselectItem } =
    useSelection();
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
  const { deleteSection, isPending: isDeletingSection } = useDeleteSection();
  const { moveProgram } = useMoveProgramInSection(activeSectionKey);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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

  function handleMoveProgram(fromIndex: number, toIndex: number) {
    moveProgram(fromIndex, toIndex);
    const nextSelection = remapSelectionAfterProgramMove(
      selectedSelection,
      activeSectionKey,
      fromIndex,
      toIndex,
    );
    if (
      nextSelection &&
      getSettingsSelectionKey(nextSelection) !== selectedSelectionId
    ) {
      selectItem(nextSelection);
    }
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
  const activeSectionEmpty =
    (sections.find((section) => section.code === activeSectionKey)?.programCodes
      .length ?? 0) === 0;

  async function handleDeleteSection() {
    if (!activeSectionKey || !activeSectionEmpty) return;
    const sectionLabel =
      sections.find((section) => section.code === activeSectionKey)?.name ||
      activeSectionKey;
    const confirmed = await showConfirm({
      title: "Удалить секцию?",
      message: `Секция «${sectionLabel}» будет удалена. Это действие нельзя отменить.`,
      confirmText: "Удалить",
      cancelText: "Отмена",
      type: "error",
    });
    if (!confirmed) return;
    deleteSection(activeSectionKey, () => {
      if (
        selectedSelection &&
        "sectionCode" in selectedSelection &&
        selectedSelection.sectionCode === activeSectionKey
      ) {
        deselectItem();
      }
    });
  }

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
    <div className="flex flex-col gap-4">
      <SectionTabsBar
        tabs={sectionMeta}
        activeKey={activeSectionKey}
        onChange={setActiveSectionKey}
        trailing={<NewSectionButton onCreated={setActiveSectionKey} />}
      />
      <div className="flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          className="btn btn-outline btn-primary btn-sm w-fit shrink-0"
          onClick={() => setImportOpen(true)}
        >
          Импорт распределения из Excel
        </button>
        {activeSectionEmpty ? (
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm w-fit shrink-0"
            disabled={isDeletingSection}
            onClick={handleDeleteSection}
          >
            {isDeletingSection ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Удалить секцию
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-6">
        {activePrograms.map((program, programListIndex) => {
          const programSelected =
            selectedSelectionId === getSettingsSelectionKey(program.selection);
          return (
            <div
              key={program.key}
              className="border-base-300 rounded-box overflow-hidden border"
            >
              <div
                className={clsx(
                  "border-base-300 flex items-center border-b",
                  program.tracks.length === 0 ? "rounded-box" : "rounded-t-box",
                  programSelected
                    ? "bg-primary/12 ring-primary ring-2 ring-inset"
                    : "bg-base-200/70",
                )}
              >
                <button
                  type="button"
                  className={clsx(
                    "flex min-w-0 flex-1 items-center justify-start gap-1 px-3 py-2 text-left text-sm font-semibold",
                    programSelected ? "" : "hover:bg-base-200",
                  )}
                  onClick={() => selectItem(program.selection)}
                >
                  <span className="min-w-0 truncate">{program.title}</span>
                  <span className="icon-[material-symbols--edit-outline-rounded] text-base-content/45 pointer-events-none shrink-0 text-lg" />
                </button>
                <div className="join shrink-0 pr-1.5">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={programListIndex === 0}
                    onClick={() =>
                      handleMoveProgram(
                        program.programIndex,
                        program.programIndex - 1,
                      )
                    }
                  >
                    <span className="icon-[material-symbols--keyboard-arrow-up-rounded] text-lg" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={programListIndex === activePrograms.length - 1}
                    onClick={() =>
                      handleMoveProgram(
                        program.programIndex,
                        program.programIndex + 1,
                      )
                    }
                  >
                    <span className="icon-[material-symbols--keyboard-arrow-down-rounded] text-lg" />
                  </button>
                </div>
              </div>
              {program.tracks.length > 0 ? (
                <div className="divide-base-300 divide-y">
                  {program.tracks.map((track, trackIndex) => {
                    const trackSelected =
                      selectedSelectionId ===
                      getSettingsSelectionKey(track.selection);
                    const isLastTrack =
                      trackIndex === program.tracks.length - 1;
                    return (
                      <div key={track.key}>
                        <button
                          type="button"
                          className={clsx(
                            "flex w-full items-center justify-start gap-1 px-3 py-1.5 text-left text-sm font-medium",
                            isLastTrack && track.groups.length === 0
                              ? "rounded-b-box"
                              : "",
                            trackSelected
                              ? "bg-primary/12 ring-primary ring-2 ring-inset"
                              : "bg-base-200/30 hover:bg-base-200/50",
                          )}
                          onClick={() => selectItem(track.selection)}
                        >
                          <span className="min-w-0 truncate">{track.name}</span>
                          <span className="icon-[material-symbols--edit-outline-rounded] text-base-content/45 pointer-events-none shrink-0 text-lg" />
                        </button>
                        {track.groups.map((group, groupIndex) => {
                          const est = group.estimatedSize;
                          const stu = group.studentsCount;
                          const metricsEqual =
                            (est == null && stu == null) ||
                            (est != null &&
                              stu != null &&
                              String(est) === String(stu));
                          const sharedDisplay = est ?? stu ?? "?";
                          const groupSelected =
                            selectedSelectionId ===
                            getSettingsSelectionKey(group.selection);
                          const isLastGroup =
                            isLastTrack &&
                            groupIndex === track.groups.length - 1;

                          return (
                            <button
                              key={group.key}
                              type="button"
                              className={clsx(
                                "border-base-300 flex w-full items-center justify-between gap-3 border-t px-3 py-1 pl-6 text-left",
                                isLastGroup ? "rounded-b-box" : "",
                                groupSelected
                                  ? "bg-primary/12 ring-primary ring-2 ring-inset"
                                  : "hover:bg-base-200/60",
                              )}
                              onClick={() => selectItem(group.selection)}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm leading-tight font-medium">
                                  {group.groupLabel}
                                </div>
                                {group.groupId !== group.groupLabel ? (
                                  <div className="text-base-content/60 truncate text-xs leading-tight">
                                    {group.groupId}
                                  </div>
                                ) : null}
                              </div>
                              {metricsEqual ? (
                                <div
                                  className="text-base-content/60 flex shrink-0 items-center gap-1 text-xs tabular-nums"
                                  title="Предположительный размер и число студентов совпадают"
                                >
                                  <span className="icon-[material-symbols--straighten-outline-rounded] shrink-0 text-sm leading-none" />
                                  <span className="icon-[material-symbols--groups-outline-rounded] shrink-0 text-sm leading-none" />
                                  <span>{sharedDisplay}</span>
                                </div>
                              ) : (
                                <div className="text-base-content/60 flex shrink-0 items-center gap-2 text-xs tabular-nums">
                                  <span
                                    className="inline-flex items-center gap-1"
                                    title="Предположительный размер"
                                  >
                                    <span className="icon-[material-symbols--straighten-outline-rounded] shrink-0 text-sm leading-none" />
                                    <span>{est ?? "?"}</span>
                                  </span>
                                  <span
                                    className="inline-flex items-center gap-1"
                                    title="Студентов"
                                  >
                                    <span className="icon-[material-symbols--groups-outline-rounded] shrink-0 text-sm leading-none" />
                                    <span>{stu ?? "—"}</span>
                                  </span>
                                </div>
                              )}
                            </button>
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
      </div>
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
      <ImportDistributionsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        config={config}
        initialSectionCode={activeSectionKey}
      />
    </div>
  );
}
