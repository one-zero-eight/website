import {
  type SchemaComponentSessionSeries,
  type SchemaCourseConfig,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { TERM_WEEKDAY_LABEL_RU } from "@/components/schedule-assistant/settings/weekdays.ts";
import { EditClassAudienceSummaryRow } from "@/components/schedule-assistant/timetable/EditClassAudienceModal.tsx";
import { EditClassAudienceMultiSelect } from "@/components/schedule-assistant/timetable/EditClassAudienceMultiSelect.tsx";
import {
  formatAudienceTokensLabel,
  meetingAudienceEqual,
  occurrenceExcludeRef,
  weeklySlotExcludeRef,
  type MeetingRef,
} from "@/components/schedule-assistant/timetable/meetingEditUtils.ts";
import { audienceSummaryHintProps } from "@/components/schedule-assistant/timetable/audienceSummaryHints.ts";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "@/components/schedule-assistant/timetable/meetingPickerIndex.ts";
import {
  SessionSeriesEditor,
  type SessionPlacement,
} from "@/components/schedule-assistant/timetable/SessionSeriesEditor.tsx";
import {
  emptyOccurrence,
  emptyWeeklySlot,
  toUiTime,
  weekdayToKey,
} from "@/components/schedule-assistant/timetable/sessionSeriesRows.tsx";
import {
  buildMeetings,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { cn } from "@/lib/ui/cn";
import {
  useEffect,
  useRef,
  useState,
  startTransition,
  type MutableRefObject,
} from "react";

function emptySeries(): SchemaComponentSessionSeries {
  return {
    audience: [],
    weekly_pattern: [],
    occurrences: null,
  };
}

function seriesMode(series: SchemaComponentSessionSeries): SessionPlacement {
  if ((series.occurrences ?? []).length > 0) return "occurrences";
  return "weekly";
}

function emptyIndexMap() {
  return new Map<number, Set<number>>();
}

function cloneIndexMap(source: Map<number, Set<number>>) {
  return new Map(
    [...source.entries()].map(([key, value]) => [key, new Set(value)]),
  );
}

function toggleIndexInMap(
  source: Map<number, Set<number>>,
  seriesIndex: number,
  rowIndex: number,
) {
  const next = cloneIndexMap(source);
  const set = new Set(next.get(seriesIndex) ?? []);
  if (set.has(rowIndex)) set.delete(rowIndex);
  else set.add(rowIndex);
  if (set.size) next.set(seriesIndex, set);
  else next.delete(seriesIndex);
  return next;
}

function reindexMapAfterSeriesRemove(
  source: Map<number, Set<number>>,
  removedSeriesIndex: number,
) {
  const next = emptyIndexMap();
  for (const [seriesIndex, set] of source) {
    if (seriesIndex === removedSeriesIndex) continue;
    next.set(
      seriesIndex > removedSeriesIndex ? seriesIndex - 1 : seriesIndex,
      new Set(set),
    );
  }
  return next;
}

function indexMapHasEntries(source: Map<number, Set<number>>) {
  for (const set of source.values()) {
    if (set.size) return true;
  }
  return false;
}

export function stripDeletedSessionRows(
  sessions: SchemaComponentSessionSeries[],
  deletedWeeklyBySeries: Map<number, Set<number>>,
  deletedOccBySeries: Map<number, Set<number>>,
  deletedSeriesIndexes?: Set<number>,
): SchemaComponentSessionSeries[] {
  const next: SchemaComponentSessionSeries[] = [];
  for (let seriesIndex = 0; seriesIndex < sessions.length; seriesIndex++) {
    if (deletedSeriesIndexes?.has(seriesIndex)) continue;
    const series = sessions[seriesIndex];
    const deletedWeekly = deletedWeeklyBySeries.get(seriesIndex);
    const deletedOcc = deletedOccBySeries.get(seriesIndex);
    const weekly = series.weekly_pattern;
    const occurrences = series.occurrences;
    next.push({
      ...series,
      weekly_pattern: weekly
        ? weekly.filter((_, index) => !deletedWeekly?.has(index))
        : weekly,
      occurrences: occurrences
        ? occurrences.filter((_, index) => !deletedOcc?.has(index))
        : occurrences,
    });
  }
  return next;
}

function SeriesAudienceButton({
  config,
  tokens,
  componentGroups,
  baselineTokens,
  perGroup = false,
  onChange,
  sectionCode,
}: {
  config: SchemaScheduleConfig;
  tokens: string[];
  componentGroups?: string[];
  baselineTokens?: string[];
  perGroup?: boolean;
  onChange: (tokens: string[]) => void;
  sectionCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(tokens);
  const displayTokens = tokens.length ? tokens : (componentGroups ?? []);
  const label = tokens.length
    ? formatAudienceTokensLabel(config, tokens)
    : "Как у компонента";
  const baselineLabel = baselineTokens?.length
    ? formatAudienceTokensLabel(config, baselineTokens)
    : "Как у компонента";
  const changed =
    baselineTokens != null && !meetingAudienceEqual(tokens, baselineTokens);
  const componentLabel = componentGroups?.length
    ? formatAudienceTokensLabel(config, componentGroups)
    : "";
  const overridesComponent =
    tokens.length > 0 && !meetingAudienceEqual(tokens, componentGroups ?? []);
  const showPatternHint =
    !changed && (perGroup ? Boolean(componentLabel) : overridesComponent);

  useEffect(() => {
    if (!open) return;
    setDraft(tokens);
  }, [open, tokens]);

  return (
    <>
      <EditClassAudienceSummaryRow
        config={config}
        tokens={displayTokens}
        displayLabel={label}
        changed={changed}
        originalLabel={baselineLabel}
        onRestoreOriginal={
          baselineTokens != null
            ? () => onChange([...baselineTokens])
            : undefined
        }
        overridden={showPatternHint}
        {...audienceSummaryHintProps({
          perGroup,
          componentLabel,
          context: "series",
        })}
        onEdit={() => setOpen(true)}
      />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Группы серии"
        containerClassName="max-w-xl"
      >
        <div className="flex flex-col gap-3">
          <p className="text-base-content/60 text-xs">
            Пусто — наследует группы компонента.
          </p>
          <EditClassAudienceMultiSelect
            editorOnly
            config={config}
            tokens={draft}
            onChange={setDraft}
            sectionCode={sectionCode}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
            >
              Сбросить
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                onChange(draft);
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

export function ComponentSessionsEditor({
  config,
  courseIndex,
  componentIndex,
  sessions,
  baselineSessions,
  courseInstructors,
  instructorPool,
  componentGroups,
  perGroup = false,
  onChange,
  onDeletedDirtyChange,
  sessionsForSaveRef,
  resetKey = 0,
}: {
  config: SchemaScheduleConfig;
  courseIndex: number | null;
  componentIndex: number | null;
  sessions: SchemaComponentSessionSeries[] | null | undefined;
  baselineSessions?: SchemaComponentSessionSeries[] | null;
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  componentGroups?: string[];
  perGroup?: boolean;
  onChange: (sessions: SchemaComponentSessionSeries[] | null) => void;
  onDeletedDirtyChange?: (dirty: boolean) => void;
  sessionsForSaveRef?: MutableRefObject<
    (() => SchemaComponentSessionSeries[] | null) | null
  >;
  resetKey?: number;
}) {
  const sectionCode =
    courseIndex != null ? config.courses![courseIndex].section_code : "";
  const list = sessions ?? [];
  const modeStashRef = useRef(
    new Map<
      number,
      {
        weekly_pattern?: SchemaComponentSessionSeries["weekly_pattern"];
        occurrences?: SchemaComponentSessionSeries["occurrences"];
      }
    >(),
  );
  const [deletedWeeklyBySeries, setDeletedWeeklyBySeries] =
    useState(emptyIndexMap);
  const [deletedOccBySeries, setDeletedOccBySeries] = useState(emptyIndexMap);
  const [deletedSeriesIndexes, setDeletedSeriesIndexes] = useState(
    () => new Set<number>(),
  );
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingIndex, setMeetingIndex] = useState<MeetingPickerIndex | null>(
    null,
  );

  useEffect(() => {
    setDeletedWeeklyBySeries(emptyIndexMap());
    setDeletedOccBySeries(emptyIndexMap());
    setDeletedSeriesIndexes(new Set());
  }, [baselineSessions, resetKey]);

  useEffect(() => {
    onDeletedDirtyChange?.(
      indexMapHasEntries(deletedWeeklyBySeries) ||
        indexMapHasEntries(deletedOccBySeries) ||
        deletedSeriesIndexes.size > 0,
    );
  }, [
    deletedOccBySeries,
    deletedSeriesIndexes,
    deletedWeeklyBySeries,
    onDeletedDirtyChange,
  ]);

  useEffect(() => {
    if (!sessionsForSaveRef) return;
    sessionsForSaveRef.current = () => {
      if (!list.length) return null;
      const next = stripDeletedSessionRows(
        list,
        deletedWeeklyBySeries,
        deletedOccBySeries,
        deletedSeriesIndexes,
      );
      return next.length ? next : null;
    };
    return () => {
      sessionsForSaveRef.current = null;
    };
  }, [
    deletedOccBySeries,
    deletedSeriesIndexes,
    deletedWeeklyBySeries,
    list,
    sessionsForSaveRef,
  ]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      const nextMeetings = buildMeetings(config);
      const nextIndex = buildMeetingPickerIndex(nextMeetings);
      if (cancelled) return;
      setMeetings(nextMeetings);
      setMeetingIndex(nextIndex);
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  function slotExcludeRef(
    seriesIndex: number,
    slotIndex: number,
  ): MeetingRef | null {
    if (courseIndex == null || componentIndex == null) return null;
    return weeklySlotExcludeRef(
      {
        courseIdx: courseIndex,
        componentIdx: componentIndex,
        seriesIdx: seriesIndex,
      },
      slotIndex,
    );
  }

  function occurrenceExcludeRefForSeries(
    seriesIndex: number,
    occIndex: number,
  ): MeetingRef | null {
    if (courseIndex == null || componentIndex == null) return null;
    return occurrenceExcludeRef(
      {
        courseIdx: courseIndex,
        componentIdx: componentIndex,
        seriesIdx: seriesIndex,
      },
      occIndex,
    );
  }

  function updateSeries(
    index: number,
    patch: Partial<SchemaComponentSessionSeries>,
  ) {
    onChange(
      list.map((series, i) => (i === index ? { ...series, ...patch } : series)),
    );
  }

  function handleRemoveSeries(seriesIndex: number) {
    const isOriginalSeries =
      baselineSessions != null && seriesIndex < baselineSessions.length;
    if (isOriginalSeries || deletedSeriesIndexes.has(seriesIndex)) {
      setDeletedSeriesIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(seriesIndex)) next.delete(seriesIndex);
        else next.add(seriesIndex);
        return next;
      });
      return;
    }
    onChange(list.filter((_, i) => i !== seriesIndex));
    setDeletedWeeklyBySeries((prev) =>
      reindexMapAfterSeriesRemove(prev, seriesIndex),
    );
    setDeletedOccBySeries((prev) =>
      reindexMapAfterSeriesRemove(prev, seriesIndex),
    );
    setDeletedSeriesIndexes((prev) => {
      const next = new Set<number>();
      for (const index of prev) {
        if (index === seriesIndex) continue;
        next.add(index > seriesIndex ? index - 1 : index);
      }
      return next;
    });
  }

  function handleRemoveWeekly(seriesIndex: number, index: number) {
    // Always soft-delete so the row stays visible with «Удалено» + undo.
    setDeletedWeeklyBySeries((prev) =>
      toggleIndexInMap(prev, seriesIndex, index),
    );
  }

  function handleRemoveOccurrence(seriesIndex: number, index: number) {
    setDeletedOccBySeries((prev) => toggleIndexInMap(prev, seriesIndex, index));
  }

  function setMode(index: number, mode: SessionPlacement) {
    const series = list[index];
    if (!series) return;
    const stash = modeStashRef.current.get(index) ?? {};
    const audienceTokens = series.audience?.length
      ? series.audience
      : (componentGroups ?? []);

    if (mode === "weekly") {
      if ((series.occurrences ?? []).length > 0) {
        stash.occurrences = series.occurrences ?? null;
      }
      const weekly = (series.weekly_pattern?.length
        ? series.weekly_pattern
        : stash.weekly_pattern?.length
          ? stash.weekly_pattern
          : null) ?? [emptyWeeklySlot(config, audienceTokens)];
      modeStashRef.current.set(index, stash);
      setDeletedOccBySeries((prev) => {
        const next = cloneIndexMap(prev);
        next.delete(index);
        return next;
      });
      updateSeries(index, {
        weekly_pattern: weekly,
        occurrences: null,
      });
      return;
    }

    if ((series.weekly_pattern ?? []).length > 0) {
      stash.weekly_pattern = series.weekly_pattern ?? null;
    }
    const occurrences = (series.occurrences?.length
      ? series.occurrences
      : stash.occurrences?.length
        ? stash.occurrences
        : null) ?? [emptyOccurrence(config, audienceTokens)];
    modeStashRef.current.set(index, stash);
    setDeletedWeeklyBySeries((prev) => {
      const next = cloneIndexMap(prev);
      next.delete(index);
      return next;
    });
    updateSeries(index, {
      weekly_pattern: null,
      occurrences,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {list.length === 0 ? (
        <div className="text-base-content/60 text-sm">
          Нет размещённых серий. Можно оставить пустым и планировать позже.
        </div>
      ) : null}

      {list.map((series, seriesIndex) => {
        const mode = seriesMode(series);
        const baselineSeries = baselineSessions?.[seriesIndex];
        const seriesDeleted = deletedSeriesIndexes.has(seriesIndex);
        const audienceTokens = series.audience?.length
          ? series.audience
          : (componentGroups ?? []);
        return (
          <div
            key={seriesIndex}
            className={cn(
              "border-base-300 rounded-box flex flex-col gap-2 border p-3",
              seriesDeleted && "border-error/40",
            )}
          >
            <SessionSeriesEditor
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              placement={mode}
              onPlacementChange={(next) => setMode(seriesIndex, next)}
              placementDisabled={seriesDeleted}
              disabled={seriesDeleted}
              beforePlacement={
                <div className="flex items-center gap-1">
                  <div className="text-sm font-medium">
                    Серия {seriesIndex + 1}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square pointer-events-auto"
                    title={seriesDeleted ? "Вернуть серию" : "Удалить серию"}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleRemoveSeries(seriesIndex);
                    }}
                  >
                    <span
                      className={
                        seriesDeleted
                          ? "icon-[material-symbols--undo-rounded] text-base"
                          : "icon-[material-symbols--delete-outline-rounded] text-base"
                      }
                    />
                  </button>
                </div>
              }
              afterPlacement={
                seriesDeleted ? (
                  <div className="text-error/80 text-xs">Удалено</div>
                ) : (
                  <SeriesAudienceButton
                    config={config}
                    tokens={series.audience ?? []}
                    componentGroups={componentGroups}
                    baselineTokens={
                      baselineSeries
                        ? (baselineSeries.audience ?? [])
                        : undefined
                    }
                    perGroup={perGroup}
                    sectionCode={sectionCode}
                    onChange={(audience) =>
                      updateSeries(seriesIndex, { audience })
                    }
                  />
                )
              }
              weeklySlots={series.weekly_pattern ?? []}
              onWeeklySlotsChange={(weekly_pattern) =>
                updateSeries(seriesIndex, { weekly_pattern })
              }
              occurrences={series.occurrences ?? []}
              onOccurrencesChange={(occurrences) =>
                updateSeries(seriesIndex, { occurrences })
              }
              audienceTokens={audienceTokens}
              courseInstructors={courseInstructors}
              instructorPool={instructorPool}
              originalWeeklySlots={baselineSeries?.weekly_pattern ?? undefined}
              originalOccurrences={baselineSeries?.occurrences ?? undefined}
              deletedWeeklyIndexes={
                deletedWeeklyBySeries.get(seriesIndex) ?? undefined
              }
              deletedOccurrenceIndexes={
                deletedOccBySeries.get(seriesIndex) ?? undefined
              }
              onRemoveWeekly={(slotIndex) =>
                handleRemoveWeekly(seriesIndex, slotIndex)
              }
              onRemoveOccurrence={(occIndex) =>
                handleRemoveOccurrence(seriesIndex, occIndex)
              }
              excludeRefForWeekly={(slotIndex) =>
                slotExcludeRef(seriesIndex, slotIndex)
              }
              excludeRefForOccurrence={(occIndex) =>
                occurrenceExcludeRefForSeries(seriesIndex, occIndex)
              }
              addButtonClassName="btn btn-ghost btn-sm self-start"
            />
          </div>
        );
      })}

      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        onClick={() => {
          onChange([
            ...list,
            {
              ...emptySeries(),
              weekly_pattern: [emptyWeeklySlot(config, componentGroups ?? [])],
            },
          ]);
        }}
      >
        + Серия
      </button>
    </div>
  );
}

export function summarizeSessions(
  sessions: SchemaComponentSessionSeries[] | null | undefined,
): string {
  if (!sessions?.length) return "";
  const weekly = sessions.reduce(
    (sum, series) => sum + (series.weekly_pattern?.length ?? 0),
    0,
  );
  const dates = sessions.reduce(
    (sum, series) => sum + (series.occurrences ?? []).length,
    0,
  );
  const parts: string[] = [];
  if (weekly) parts.push(`${weekly} слот.`);
  if (dates) parts.push(`${dates} дат`);
  if (!parts.length) parts.push(`${sessions.length} сер.`);
  return parts.join(", ");
}

export function formatWeeklySlotChip(slot: SchemaWeeklyPatternSlot): string {
  const key = weekdayToKey(slot.weekday);
  return `${TERM_WEEKDAY_LABEL_RU[key]} ${toUiTime(slot.start_time)}`;
}
