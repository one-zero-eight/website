import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  resolveWeeklyMeetingFields,
  semesterDatesForWeekday,
  weeklyPatternDayKey,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { resolveAudienceSemester } from "@/components/schedule-assistant/timetable/programTimeSlots.ts";

const DEFAULT_TAG_ORDER = ["lec", "tut", "lab", "class"] as const;

export type InstructorLessonBreakdown = Map<string, number>;

function instructorIds(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function bumpTag(
  counts: Map<string, InstructorLessonBreakdown>,
  value: string | string[] | null | undefined,
  tag: string,
) {
  const normalizedTag = tag.trim() || "class";
  for (const instructorId of instructorIds(value)) {
    let byTag = counts.get(instructorId);
    if (!byTag) {
      byTag = new Map();
      counts.set(instructorId, byTag);
    }
    byTag.set(normalizedTag, (byTag.get(normalizedTag) ?? 0) + 1);
  }
}

/**
 * Count placed lessons per instructor inside one course, grouped by component tag.
 * Occurrences: +1 each.
 * Weekly pattern slots: +1 per term week for that weekday (skips cancelled weeks).
 */
export function countCourseLessonsByInstructor(
  course: SchemaCourseConfig | null | undefined,
  config: SchemaScheduleConfig | null | undefined,
): Map<string, InstructorLessonBreakdown> {
  const counts = new Map<string, InstructorLessonBreakdown>();
  const term = config?.term;
  if (!course || !term?.semester?.start_date || !term.semester.end_date) {
    return counts;
  }
  if (!config) return counts;

  for (const component of course.components ?? []) {
    const tag = String(component.tag ?? "").trim() || "class";
    for (const session of component.sessions ?? []) {
      for (const occurrence of session.occurrences ?? []) {
        bumpTag(counts, occurrence.instructor, tag);
      }

      const audienceTokens =
        (session.audience?.length
          ? session.audience
          : component.student_groups) || [];
      const window = resolveAudienceSemester(config, audienceTokens);
      if (window == null) continue;

      for (const slot of session.weekly_pattern ?? []) {
        const weekday = weeklyPatternDayKey(String(slot.weekday ?? ""));
        if (!weekday) continue;
        for (const date of semesterDatesForWeekday(config, weekday, window)) {
          const resolved = resolveWeeklyMeetingFields(slot, date, config);
          if (resolved.cancelled) continue;
          bumpTag(counts, resolved.instructors, tag);
        }
      }
    }
  }

  return counts;
}

function tagSortKey(tag: string, order: readonly string[]): [number, string] {
  const index = order.indexOf(tag);
  return [index >= 0 ? index : order.length, tag];
}

export function formatLessonBreakdown(
  breakdown: InstructorLessonBreakdown | undefined,
  tagOrder?: readonly string[] | null,
): string {
  if (!breakdown || breakdown.size === 0) return "0";
  const order = tagOrder && tagOrder.length > 0 ? tagOrder : DEFAULT_TAG_ORDER;
  return [...breakdown.entries()]
    .filter(([, count]) => count > 0)
    .sort((left, right) => {
      const [leftRank, leftTag] = tagSortKey(left[0], order);
      const [rightRank, rightTag] = tagSortKey(right[0], order);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return leftTag.localeCompare(rightTag);
    })
    .map(([tag, count]) => `${count} ${tag}`)
    .join(", ");
}
