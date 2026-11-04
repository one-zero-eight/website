import type {
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { t } from "@lingui/core/macro";

import { normalizeTypedHhmm } from "./meetingEditUtils.ts";

export function instructorValue(
  instructor: string | string[] | null | undefined,
): string {
  if (Array.isArray(instructor)) return String(instructor[0] || "").trim();
  return String(instructor || "").trim();
}

/** Returns a Russian error message, or null when the draft is valid. */
export function validateSessionSeriesDraft({
  placement,
  weeklySlots,
  occurrences,
  deletedWeeklyIndexes,
  deletedOccurrenceIndexes,
}: {
  placement: "weekly" | "dates_pattern";
  weeklySlots: SchemaWeeklyPatternSlot[];
  occurrences: SchemaSessionOccurrence[];
  deletedWeeklyIndexes?: Set<number>;
  deletedOccurrenceIndexes?: Set<number>;
}): string | null {
  if (placement === "dates_pattern") {
    const active = occurrences.filter(
      (_, index) => !deletedOccurrenceIndexes?.has(index),
    );
    if (!active.length) return t`Add at least one date.`;
    for (const [index, occurrence] of active.entries()) {
      const row = index + 1;
      if (!String(occurrence.date || "").trim()) {
        return t`Enter a date for row ${row}.`;
      }
      if (!normalizeTypedHhmm(occurrence.start_time).slice(0, 5)) {
        return t`Enter a time for row ${row}.`;
      }
    }
    return null;
  }

  const active = weeklySlots.filter(
    (_, index) => !deletedWeeklyIndexes?.has(index),
  );
  if (!active.length) return t`Add at least one slot.`;
  for (const [index, slot] of active.entries()) {
    const row = index + 1;
    if (!slot.weekday) {
      return t`Enter a day for row ${row}.`;
    }
    if (!normalizeTypedHhmm(slot.start_time).slice(0, 5)) {
      return t`Enter a time for row ${row}.`;
    }
  }
  return null;
}
