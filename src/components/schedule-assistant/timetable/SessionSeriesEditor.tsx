import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { TERM_WEEKDAY_LABEL_RU } from "@/components/schedule-assistant/settings/weekdays.ts";
import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

import type { MeetingRef } from "./meetingEditUtils.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import { occurrenceRowMarks, weeklyRowMarks } from "./sessionRowMarks.ts";
import { roomPickerDatesForEdit } from "./roomPickerOptions.ts";
import {
  draftMeetingsFromOccurrences,
  draftMeetingsFromWeeklySlots,
  emptyOccurrence,
  emptyWeeklySlot,
  OccurrenceRow,
  weekdayToKey,
  WeeklySlotRow,
} from "./sessionSeriesRows.tsx";
import type { Meeting, MeetingOverrideField } from "./timetableViewerModel.ts";

export type SessionPlacement = "weekly" | "dates_pattern";

export function SessionPlacementToggle({
  placement,
  onChange,
  disabled,
}: {
  placement: SessionPlacement;
  onChange: (placement: SessionPlacement) => void;
  disabled?: boolean;
}) {
  return (
    <div className="join">
      <button
        type="button"
        className={cn(
          "btn btn-sm join-item",
          placement === "weekly" && "btn-active",
        )}
        disabled={disabled}
        onClick={() => onChange("weekly")}
      >
        Еженедельно
      </button>
      <button
        type="button"
        className={cn(
          "btn btn-sm join-item",
          placement === "dates_pattern" && "btn-active",
        )}
        disabled={disabled}
        onClick={() => onChange("dates_pattern")}
      >
        Даты
      </button>
    </div>
  );
}

export function SessionSeriesEditor({
  config,
  meetings,
  meetingIndex,
  placement,
  onPlacementChange,
  placementDisabled,
  beforePlacement,
  afterPlacement,
  weeklySlots,
  onWeeklySlotsChange,
  occurrences,
  onOccurrencesChange,
  audienceTokens,
  courseInstructors,
  instructorPool,
  originalWeeklySlots,
  originalOccurrences,
  deletedWeeklyIndexes,
  deletedOccurrenceIndexes,
  onRemoveWeekly,
  onRemoveOccurrence,
  focusIndex = null,
  showFocusRing = false,
  /** First N rows are existing series entries (not removable; muted). */
  lockedRowCount = 0,
  /** Highlight rows at/after this index as newly added (create append). */
  highlightFromIndex = null,
  overrideFields,
  marksDisabled = false,
  excludeRefForWeekly,
  excludeRefForOccurrence,
  newOccurrenceDefaults,
  newWeeklyDefaults,
  addButtonClassName = "btn btn-outline btn-sm self-start",
  disabled,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  placement: SessionPlacement;
  onPlacementChange: (placement: SessionPlacement) => void;
  placementDisabled?: boolean;
  /** When set (e.g. «Серия N»), placement toggle is on the next row. */
  beforePlacement?: ReactNode;
  /** Audience / actions opposite the title or placement toggle. */
  afterPlacement?: ReactNode;
  weeklySlots: SchemaWeeklyPatternSlot[];
  onWeeklySlotsChange: (slots: SchemaWeeklyPatternSlot[]) => void;
  occurrences: SchemaSessionOccurrence[];
  onOccurrencesChange: (occurrences: SchemaSessionOccurrence[]) => void;
  audienceTokens: string[];
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  originalWeeklySlots?: SchemaWeeklyPatternSlot[];
  originalOccurrences?: SchemaSessionOccurrence[];
  deletedWeeklyIndexes?: Set<number>;
  deletedOccurrenceIndexes?: Set<number>;
  onRemoveWeekly?: (index: number) => void;
  onRemoveOccurrence?: (index: number) => void;
  focusIndex?: number | null;
  showFocusRing?: boolean;
  lockedRowCount?: number;
  highlightFromIndex?: number | null;
  overrideFields?: MeetingOverrideField[];
  marksDisabled?: boolean;
  excludeRefForWeekly?: (index: number) => MeetingRef | null;
  excludeRefForOccurrence?: (index: number) => MeetingRef | null;
  newOccurrenceDefaults?: Partial<SchemaSessionOccurrence>;
  newWeeklyDefaults?: Partial<SchemaWeeklyPatternSlot>;
  addButtonClassName?: string;
  disabled?: boolean;
}) {
  const deletedWeekly = deletedWeeklyIndexes ?? new Set<number>();
  const deletedOcc = deletedOccurrenceIndexes ?? new Set<number>();

  function handleRemoveWeekly(index: number) {
    if (index < lockedRowCount) return;
    if (onRemoveWeekly) {
      onRemoveWeekly(index);
      return;
    }
    onWeeklySlotsChange(weeklySlots.filter((_, i) => i !== index));
  }

  function handleRemoveOccurrence(index: number) {
    if (index < lockedRowCount) return;
    if (onRemoveOccurrence) {
      onRemoveOccurrence(index);
      return;
    }
    onOccurrencesChange(occurrences.filter((_, i) => i !== index));
  }

  function rowFocusClass(index: number, deleted: boolean) {
    const isFocus = showFocusRing && focusIndex === index;
    return cn(
      isFocus &&
        !deleted &&
        (placement === "dates_pattern"
          ? occurrences.length > 1
          : weeklySlots.length > 1) &&
        "ring-primary/70 rounded-box ring-4",
    );
  }

  const toggle = (
    <SessionPlacementToggle
      placement={placement}
      onChange={onPlacementChange}
      disabled={placementDisabled || disabled}
    />
  );

  const rows =
    placement === "dates_pattern" ? (
      <div className="flex flex-col gap-2">
        {occurrences.map((occurrence, index) => {
          const deleted = deletedOcc.has(index);
          const locked = index < lockedRowCount;
          const highlighted =
            highlightFromIndex != null &&
            index >= highlightFromIndex &&
            !deleted;
          return (
            <div key={`occ-${index}`} className={rowFocusClass(index, deleted)}>
              <div className={cn(locked && "pointer-events-none opacity-60")}>
                <OccurrenceRow
                  config={config}
                  meetings={meetings}
                  meetingIndex={meetingIndex}
                  extraMeetings={draftMeetingsFromOccurrences(
                    occurrences,
                    index,
                    deletedOcc,
                  )}
                  occurrence={occurrence}
                  audienceTokens={audienceTokens}
                  courseInstructors={courseInstructors}
                  instructorPool={instructorPool}
                  excludeRef={excludeRefForOccurrence?.(index) ?? null}
                  deleted={deleted}
                  highlighted={highlighted}
                  removable={!locked}
                  fieldMarks={occurrenceRowMarks({
                    current: occurrence,
                    original: originalOccurrences?.[index],
                    overrideFields,
                    isFocus: Boolean(showFocusRing && focusIndex === index),
                    cancelChecked: marksDisabled || deleted || locked,
                    onRestore: (next) => {
                      const list = [...occurrences];
                      list[index] = next;
                      onOccurrencesChange(list);
                    },
                  })}
                  onChange={(next) => {
                    if (locked) return;
                    const list = [...occurrences];
                    list[index] = next;
                    onOccurrencesChange(list);
                  }}
                  onRemove={() => handleRemoveOccurrence(index)}
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className={addButtonClassName}
          onClick={() =>
            onOccurrencesChange([
              ...occurrences,
              {
                ...emptyOccurrence(config, audienceTokens),
                ...newOccurrenceDefaults,
              },
            ])
          }
        >
          + Дата
        </button>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        {weeklySlots.map((slot, index) => {
          const deleted = deletedWeekly.has(index);
          const locked = index < lockedRowCount;
          const highlighted =
            highlightFromIndex != null &&
            index >= highlightFromIndex &&
            !deleted;
          const original = originalWeeklySlots?.[index];
          const originalWeekdayLabel = original
            ? TERM_WEEKDAY_LABEL_RU[weekdayToKey(String(original.weekday))]
            : "";
          return (
            <div key={`wp-${index}`} className={rowFocusClass(index, deleted)}>
              <div className={cn(locked && "pointer-events-none opacity-60")}>
                <WeeklySlotRow
                  config={config}
                  meetings={meetings}
                  meetingIndex={meetingIndex}
                  extraMeetings={draftMeetingsFromWeeklySlots(
                    weeklySlots,
                    index,
                    deletedWeekly,
                    (weekday) => roomPickerDatesForEdit({ config, weekday }),
                  )}
                  slot={slot}
                  audienceTokens={audienceTokens}
                  courseInstructors={courseInstructors}
                  instructorPool={instructorPool}
                  excludeRef={excludeRefForWeekly?.(index) ?? null}
                  deleted={deleted}
                  highlighted={highlighted}
                  removable={!locked}
                  fieldMarks={weeklyRowMarks({
                    current: slot,
                    original,
                    overrideFields,
                    isFocus: Boolean(showFocusRing && focusIndex === index),
                    cancelChecked: marksDisabled || deleted || locked,
                    weekdayLabel: originalWeekdayLabel,
                    onRestore: (next) => {
                      const list = [...weeklySlots];
                      list[index] = next;
                      onWeeklySlotsChange(list);
                    },
                  })}
                  onChange={(next) => {
                    if (locked) return;
                    const list = [...weeklySlots];
                    list[index] = next;
                    onWeeklySlotsChange(list);
                  }}
                  onRemove={() => handleRemoveWeekly(index)}
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className={addButtonClassName}
          onClick={() =>
            onWeeklySlotsChange([
              ...weeklySlots,
              {
                ...emptyWeeklySlot(config, audienceTokens),
                ...newWeeklyDefaults,
              },
            ])
          }
        >
          + Слот
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      {beforePlacement ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {beforePlacement}
            {afterPlacement ? (
              <div className="flex flex-wrap items-center gap-1">
                {afterPlacement}
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "flex flex-col gap-2",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {toggle}
            {rows}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={cn(disabled && "pointer-events-none opacity-50")}>
              {toggle}
            </div>
            {afterPlacement}
          </div>
          <div
            className={cn(
              "flex flex-col gap-2",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {rows}
          </div>
        </>
      )}
    </div>
  );
}
