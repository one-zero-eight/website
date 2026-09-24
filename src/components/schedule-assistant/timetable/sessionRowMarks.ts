import type {
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  toUiTime,
  weekdayToKey,
  type SessionRowFieldMarks,
} from "./sessionSeriesRows.tsx";
import { instructorValue } from "./sessionSeriesValidation.ts";
import type { MeetingOverrideField } from "./timetableViewerModel.ts";
import { formatDisplayDate } from "./timetableViewerModel.ts";

export function normalizeOccurrence(occurrence: SchemaSessionOccurrence) {
  return {
    date: String(occurrence.date || "").trim(),
    start_time: toUiTime(occurrence.start_time),
    end_time: toUiTime(occurrence.end_time),
    room: String(occurrence.room || "").trim() || null,
    instructor: instructorValue(occurrence.instructor) || null,
  };
}

export function normalizeWeeklySlot(slot: SchemaWeeklyPatternSlot) {
  return {
    weekday: weekdayToKey(String(slot.weekday || "")),
    start_time: toUiTime(slot.start_time),
    end_time: toUiTime(slot.end_time),
    room: String(slot.room || "").trim() || null,
    instructor: instructorValue(slot.instructor) || null,
    edits: slot.edits ?? null,
  };
}

export function occurrenceRowMarks({
  current,
  original,
  overrideFields,
  isFocus = false,
  cancelChecked = false,
  onRestore,
}: {
  current: SchemaSessionOccurrence;
  original?: SchemaSessionOccurrence;
  overrideFields?: MeetingOverrideField[];
  isFocus?: boolean;
  cancelChecked?: boolean;
  onRestore: (next: SchemaSessionOccurrence) => void;
}): SessionRowFieldMarks {
  if (cancelChecked || !original) return {};

  const cur = normalizeOccurrence(current);
  const orig = normalizeOccurrence(original);
  const hint = (
    changed: boolean,
    field: MeetingOverrideField | "date",
    originalLabel: string,
    patch: Partial<SchemaSessionOccurrence>,
  ) => {
    if (changed) {
      return {
        mark: "changed" as const,
        originalLabel,
        onRestore: () => onRestore({ ...current, ...patch }),
      };
    }
    if (isFocus && field !== "date" && overrideFields?.includes(field)) {
      return { mark: "overridden" as const };
    }
    return undefined;
  };

  return {
    date: hint(cur.date !== orig.date, "date", formatDisplayDate(orig.date), {
      date: original.date,
    }),
    time: hint(
      cur.start_time !== orig.start_time || cur.end_time !== orig.end_time,
      "time",
      orig.end_time ? `${orig.start_time}–${orig.end_time}` : orig.start_time,
      {
        start_time: original.start_time,
        end_time: original.end_time,
      },
    ),
    room: hint(cur.room !== orig.room, "room", orig.room || "—", {
      room: original.room ?? null,
    }),
    instructor: hint(
      cur.instructor !== orig.instructor,
      "instructor",
      orig.instructor || "—",
      { instructor: original.instructor ?? null },
    ),
  };
}

export function weeklyRowMarks({
  current,
  original,
  overrideFields,
  isFocus = false,
  cancelChecked = false,
  weekdayLabel,
  onRestore,
}: {
  current: SchemaWeeklyPatternSlot;
  original?: SchemaWeeklyPatternSlot;
  overrideFields?: MeetingOverrideField[];
  isFocus?: boolean;
  cancelChecked?: boolean;
  weekdayLabel: string;
  onRestore: (next: SchemaWeeklyPatternSlot) => void;
}): SessionRowFieldMarks {
  if (cancelChecked || !original) return {};

  const cur = normalizeWeeklySlot(current);
  const orig = normalizeWeeklySlot(original);
  const hint = (
    changed: boolean,
    field: MeetingOverrideField,
    originalLabel: string,
    patch: Partial<SchemaWeeklyPatternSlot>,
  ) => {
    if (changed) {
      return {
        mark: "changed" as const,
        originalLabel,
        onRestore: () => onRestore({ ...current, ...patch }),
      };
    }
    if (isFocus && overrideFields?.includes(field)) {
      return { mark: "overridden" as const };
    }
    return undefined;
  };

  return {
    weekday: hint(
      cur.weekday !== orig.weekday,
      "weekday",
      weekdayLabel || (orig.weekday as TermWeekdayKey),
      {
        weekday: original.weekday,
      },
    ),
    time: hint(
      cur.start_time !== orig.start_time || cur.end_time !== orig.end_time,
      "time",
      orig.end_time ? `${orig.start_time}–${orig.end_time}` : orig.start_time,
      {
        start_time: original.start_time,
        end_time: original.end_time,
      },
    ),
    room: hint(cur.room !== orig.room, "room", orig.room || "—", {
      room: original.room ?? null,
    }),
    instructor: hint(
      cur.instructor !== orig.instructor,
      "instructor",
      orig.instructor || "—",
      { instructor: original.instructor ?? null },
    ),
  };
}
