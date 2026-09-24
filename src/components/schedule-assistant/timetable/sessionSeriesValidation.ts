import type {
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";

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
    if (!active.length) return "Добавьте хотя бы одну дату.";
    for (const [index, occurrence] of active.entries()) {
      if (!String(occurrence.date || "").trim()) {
        return `Укажите дату для строки ${index + 1}.`;
      }
      if (!normalizeTypedHhmm(occurrence.start_time).slice(0, 5)) {
        return `Укажите время для строки ${index + 1}.`;
      }
    }
    return null;
  }

  const active = weeklySlots.filter(
    (_, index) => !deletedWeeklyIndexes?.has(index),
  );
  if (!active.length) return "Добавьте хотя бы один слот.";
  for (const [index, slot] of active.entries()) {
    if (!slot.weekday) {
      return `Укажите день для строки ${index + 1}.`;
    }
    if (!normalizeTypedHhmm(slot.start_time).slice(0, 5)) {
      return `Укажите время для строки ${index + 1}.`;
    }
  }
  return null;
}
