import type {
  SchemaComponent,
  SchemaComponentSessionSeries,
  SchemaCourseConfig,
  SchemaInstructor,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { ComponentSessionsEditor } from "@/components/schedule-assistant/settings/courses/ComponentSessionsEditor.tsx";
import { InstructorPoolEditor } from "@/components/schedule-assistant/settings/courses/InstructorPoolEditor.tsx";
import { AudienceTokensInfoIcon } from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { EditClassAudienceMultiSelect } from "@/components/schedule-assistant/timetable/EditClassAudienceMultiSelect.tsx";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "@/components/schedule-assistant/timetable/audienceSelectorTree.ts";
import { formatAudienceTokensLabel } from "@/components/schedule-assistant/timetable/meetingEditUtils.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useRef, useState } from "react";

type EditTab = "basics" | "people" | "sessions";

function cloneComponent(component: SchemaComponent): SchemaComponent {
  return structuredClone(component);
}

function normalizeComponentForCompare(
  component: SchemaComponent,
  tree: ReturnType<typeof buildAudienceSelectorTree>,
): string {
  return JSON.stringify({
    tag: String(component.tag || "").trim(),
    per_week:
      component.per_week === null || component.per_week === undefined
        ? null
        : Number(component.per_week),
    per_semester:
      component.per_semester === null || component.per_semester === undefined
        ? null
        : Number(component.per_semester),
    per_group: Boolean(component.per_group),
    student_groups: minimizeAudienceTokens(
      component.student_groups ?? [],
      tree,
    ),
    instructor_pool: component.instructor_pool ?? [],
    sessions:
      component.sessions && component.sessions.length
        ? component.sessions
        : null,
  });
}

function AudienceSummaryEditor({
  config,
  tokens,
  onChange,
}: {
  config: SchemaScheduleConfig;
  tokens: string[];
  onChange: (tokens: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(tokens);
  const tree = useMemo(() => buildAudienceSelectorTree(config), [config]);
  const label = tokens.length
    ? formatAudienceTokensLabel(config, tokens)
    : "Не выбраны";
  const expandedCount = expandStudentGroupSelectors(config, tokens).length;

  useEffect(() => {
    if (!open) return;
    setDraft(minimizeAudienceTokens(tokens, tree));
  }, [open, tokens, tree]);

  return (
    <>
      <div className="border-base-300 rounded-box flex items-start justify-between gap-3 border px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-base-content/50 text-xs">Группы</div>
          <div className="mt-0.5 inline-flex max-w-full items-center gap-1 text-sm leading-snug">
            <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
            <AudienceTokensInfoIcon config={config} tokens={tokens} />
          </div>
          {expandedCount > 0 ? (
            <div className="text-base-content/45 mt-0.5 text-xs">
              {expandedCount} групп после раскрытия
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0"
          onClick={() => setOpen(true)}
        >
          Изменить
        </button>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Группы компонента"
        containerClassName="max-w-xl"
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
            <div className="text-base-content/50 text-xs">Выбрано</div>
            <div className="mt-0.5 inline-flex min-w-0 items-center gap-1 leading-snug">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {draft.length
                  ? formatAudienceTokensLabel(config, draft)
                  : "Не выбраны"}
              </span>
              {draft.length ? (
                <AudienceTokensInfoIcon config={config} tokens={draft} />
              ) : null}
            </div>
          </div>
          <EditClassAudienceMultiSelect
            editorOnly
            config={config}
            tokens={draft}
            onChange={setDraft}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onChange(minimizeAudienceTokens(draft, tree));
                setOpen(false);
              }}
            >
              Готово
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function ComponentEditModal({
  open,
  onOpenChange,
  config,
  courseIndex,
  componentIndex,
  component,
  isNew = false,
  tagOptions,
  instructors,
  courseInstructors,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SchemaScheduleConfig;
  courseIndex: number;
  componentIndex: number | null;
  component: SchemaComponent | null;
  isNew?: boolean;
  tagOptions: string[];
  instructors: SchemaInstructor[];
  courseInstructors: SchemaCourseConfig["instructors"];
  onSave: (component: SchemaComponent) => void;
}) {
  const [draft, setDraft] = useState<SchemaComponent | null>(null);
  const [baseline, setBaseline] = useState<SchemaComponent | null>(null);
  const [tab, setTab] = useState<EditTab>("basics");
  const [sessionDeletesDirty, setSessionDeletesDirty] = useState(false);
  const [sessionsResetKey, setSessionsResetKey] = useState(0);
  const sessionsForSaveRef = useRef<
    (() => SchemaComponentSessionSeries[] | null) | null
  >(null);
  const tree = useMemo(() => buildAudienceSelectorTree(config), [config]);

  useEffect(() => {
    if (!open || !component) return;
    const next = cloneComponent(component);
    next.student_groups = minimizeAudienceTokens(
      next.student_groups ?? [],
      tree,
    );
    setDraft(next);
    setBaseline(cloneComponent(next));
    setSessionDeletesDirty(false);
    setSessionsResetKey((key) => key + 1);
    setTab("basics");
  }, [open, component, tree]);

  const tagSelectOptions = useMemo(() => {
    const tags = [...tagOptions];
    const current = String(draft?.tag || "").trim();
    if (current && !tags.includes(current)) tags.push(current);
    return tags.map((tag) => ({ value: tag, label: tag }));
  }, [draft?.tag, tagOptions]);

  const poolCount = draft?.instructor_pool?.length ?? 0;
  const sessionCount = draft?.sessions?.length ?? 0;
  const hasTag = Boolean(String(draft?.tag || "").trim());
  const isDirty =
    (!!draft &&
      !!baseline &&
      normalizeComponentForCompare(draft, tree) !==
        normalizeComponentForCompare(baseline, tree)) ||
    sessionDeletesDirty;
  const canSave = hasTag && (isNew || isDirty);

  function handleClose() {
    onOpenChange(false);
  }

  function handleReset() {
    if (!baseline) return;
    setDraft(cloneComponent(baseline));
    setSessionDeletesDirty(false);
    setSessionsResetKey((key) => key + 1);
  }

  function handleSave() {
    if (!draft || !canSave) return;
    const tag = String(draft.tag || "").trim();
    if (!tag) return;
    const sessions =
      sessionsForSaveRef.current?.() ??
      (draft.sessions && draft.sessions.length ? draft.sessions : null);
    onSave({
      ...draft,
      tag,
      student_groups: minimizeAudienceTokens(draft.student_groups ?? [], tree),
      instructor_pool: draft.instructor_pool ?? [],
      per_group: Boolean(draft.per_group),
      per_week:
        draft.per_week === null || draft.per_week === undefined
          ? null
          : Number(draft.per_week),
      per_semester:
        draft.per_semester === null || draft.per_semester === undefined
          ? null
          : Number(draft.per_semester),
      sessions: sessions && sessions.length ? sessions : null,
    });
    onOpenChange(false);
  }

  if (!draft) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} title="Компонент">
        <div className="skeleton h-40 w-full" />
      </Modal>
    );
  }

  const tabs: { id: EditTab; label: string; hint?: string }[] = [
    { id: "basics", label: "Основное" },
    {
      id: "people",
      label: "Преподаватели",
      hint: poolCount ? String(poolCount) : undefined,
    },
    {
      id: "sessions",
      label: "Занятия",
      hint: sessionCount ? String(sessionCount) : undefined,
    },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title={`Компонент · ${draft.tag || "новый"}`}
      overlayClassName="!flex items-start justify-center overflow-hidden py-4"
      containerClassName="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <div className="tabs tabs-box tabs-sm bg-base-200/60 w-full p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "tab grow gap-1.5",
                tab === item.id && "tab-active",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.hint ? (
                <span className="text-base-content/50 text-[0.65rem]">
                  {item.hint}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "basics" ? (
          <div className="flex flex-col gap-4">
            <label className="form-control w-full gap-1.5">
              <span className="label-text text-xs font-medium tracking-wide uppercase">
                Тип (tag)
              </span>
              <SelectDropdown
                value={String(draft.tag || "")}
                onChange={(tag) => setDraft({ ...draft, tag })}
                options={tagSelectOptions}
                placeholder="lec / tut / lab…"
                searchable
                trailingOption={(query) => {
                  const trimmed = query.trim();
                  if (!trimmed) return null;
                  if (
                    tagSelectOptions.some((option) => option.value === trimmed)
                  ) {
                    return null;
                  }
                  return { value: trimmed, label: `Создать «${trimmed}»` };
                }}
              />
            </label>

            <AudienceSummaryEditor
              config={config}
              tokens={draft.student_groups ?? []}
              onChange={(student_groups) =>
                setDraft({ ...draft, student_groups })
              }
            />

            <label className="label cursor-pointer justify-start gap-3 px-0">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={Boolean(draft.per_group)}
                onChange={(event) =>
                  setDraft({ ...draft, per_group: event.target.checked })
                }
              />
              <span className="label-text text-sm leading-snug">
                Отдельное занятие на каждую группу
                <span className="text-base-content/55 block text-xs">
                  Для lab: каждая группа в своё время/локацию. Иначе все группы
                  вместе.
                </span>
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control w-full gap-1.5">
                <span className="label-text text-xs font-medium tracking-wide uppercase">
                  Цель в неделю
                </span>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered input-sm w-full"
                  value={draft.per_week ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setDraft({
                      ...draft,
                      per_week: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="—"
                />
              </label>
              <label className="form-control w-full gap-1.5">
                <span className="label-text text-xs font-medium tracking-wide uppercase">
                  Цель за семестр
                </span>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered input-sm w-full"
                  value={draft.per_semester ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setDraft({
                      ...draft,
                      per_semester: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="—"
                />
              </label>
            </div>
          </div>
        ) : null}

        {tab === "people" ? (
          <InstructorPoolEditor
            value={draft.instructor_pool ?? []}
            onChange={(instructor_pool) =>
              setDraft({ ...draft, instructor_pool })
            }
            instructors={instructors}
            courseInstructors={courseInstructors}
          />
        ) : null}

        {tab === "sessions" ? (
          <ComponentSessionsEditor
            config={config}
            courseIndex={courseIndex}
            componentIndex={componentIndex}
            sessions={draft.sessions}
            courseInstructors={courseInstructors}
            instructorPool={draft.instructor_pool}
            componentGroups={draft.student_groups}
            perGroup={Boolean(draft.per_group)}
            onChange={(sessions) => setDraft({ ...draft, sessions })}
            baselineSessions={baseline?.sessions}
            onDeletedDirtyChange={setSessionDeletesDirty}
            sessionsForSaveRef={sessionsForSaveRef}
            resetKey={sessionsResetKey}
          />
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t pt-3">
          {isDirty ? (
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content/80 text-sm"
              onClick={handleReset}
            >
              Сбросить изменения
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  );
}
