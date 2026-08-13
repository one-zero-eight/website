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
import {
  emptyOccurrence,
  emptyWeeklySlot,
  OccurrenceRow,
  weekdayToKey,
  WeeklySlotRow,
} from "./sessionSeriesRows.tsx";
import type { Meeting, MeetingOverrideField } from "./timetableViewerModel.ts";

export type SessionPlacement = "weekly" | "occurrences";

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
          placement === "occurrences" && "btn-active",
        )}
        disabled={disabled}
        onClick={() => onChange("occurrences")}
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
    if (onRemoveWeekly) {
      onRemoveWeekly(index);
      return;
    }
    onWeeklySlotsChange(weeklySlots.filter((_, i) => i !== index));
  }

  function handleRemoveOccurrence(index: number) {
    if (onRemoveOccurrence) {
      onRemoveOccurrence(index);
      return;
    }
    onOccurrencesChange(occurrences.filter((_, i) => i !== index));
  }

  const toggle = (
    <SessionPlacementToggle
      placement={placement}
      onChange={onPlacementChange}
      disabled={placementDisabled || disabled}
    />
  );

  const rows =
    placement === "occurrences" ? (
      <div className="flex flex-col gap-2">
        {occurrences.map((occurrence, index) => {
          const isFocus = showFocusRing && focusIndex === index;
          const original = originalOccurrences?.[index];
          const deleted = deletedOcc.has(index);
          return (
            <div
              key={`occ-${index}`}
              className={cn(
                isFocus &&
                  !deleted &&
                  occurrences.length > 1 &&
                  "ring-primary/70 rounded-box ring-4",
              )}
            >
              <OccurrenceRow
                config={config}
                meetings={meetings}
                meetingIndex={meetingIndex}
                occurrence={occurrence}
                audienceTokens={audienceTokens}
                courseInstructors={courseInstructors}
                instructorPool={instructorPool}
                excludeRef={excludeRefForOccurrence?.(index) ?? null}
                deleted={deleted}
                removable
                fieldMarks={occurrenceRowMarks({
                  current: occurrence,
                  original,
                  overrideFields,
                  isFocus: Boolean(isFocus),
                  cancelChecked: marksDisabled || deleted,
                  onRestore: (next) => {
                    const list = [...occurrences];
                    list[index] = next;
                    onOccurrencesChange(list);
                  },
                })}
                onChange={(next) => {
                  const list = [...occurrences];
                  list[index] = next;
                  onOccurrencesChange(list);
                }}
                onRemove={() => handleRemoveOccurrence(index)}
              />
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
          const isFocus = showFocusRing && focusIndex === index;
          const original = originalWeeklySlots?.[index];
          const deleted = deletedWeekly.has(index);
          const originalWeekdayLabel = original
            ? TERM_WEEKDAY_LABEL_RU[weekdayToKey(String(original.weekday))]
            : "";
          return (
            <div
              key={`wp-${index}`}
              className={cn(
                isFocus &&
                  !deleted &&
                  weeklySlots.length > 1 &&
                  "ring-primary/70 rounded-box ring-4",
              )}
            >
              <WeeklySlotRow
                config={config}
                meetings={meetings}
                meetingIndex={meetingIndex}
                slot={slot}
                audienceTokens={audienceTokens}
                courseInstructors={courseInstructors}
                instructorPool={instructorPool}
                excludeRef={excludeRefForWeekly?.(index) ?? null}
                deleted={deleted}
                removable
                fieldMarks={weeklyRowMarks({
                  current: slot,
                  original,
                  overrideFields,
                  isFocus: Boolean(isFocus),
                  cancelChecked: marksDisabled || deleted,
                  weekdayLabel: originalWeekdayLabel,
                  onRestore: (next) => {
                    const list = [...weeklySlots];
                    list[index] = next;
                    onWeeklySlotsChange(list);
                  },
                })}
                onChange={(next) => {
                  const list = [...weeklySlots];
                  list[index] = next;
                  onWeeklySlotsChange(list);
                }}
                onRemove={() => handleRemoveWeekly(index)}
              />
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
