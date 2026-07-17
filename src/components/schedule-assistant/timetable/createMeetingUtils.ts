import type {
  SchemaComponent,
  SchemaComponentSessionSeries,
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  meetingAudienceEqual,
  resolveEndTimeForStart,
} from "./meetingEditUtils.ts";
import type { WeekRange } from "./timetableViewerModel.ts";
import { weekStartForDate } from "./timetableViewerModel.ts";

export type CreateMeetingCellContext = {
  weekday: TermWeekdayKey;
  time: string;
  date: string;
  groupId?: string;
};

export type CreateMeetingDraft = {
  courseIdx: number;
  componentIdx: number;
  date: string;
  weekday: TermWeekdayKey;
  time: string;
  room: string;
  instructor: string;
  audience: string[];
};

const WEEKDAY_TO_JS_INDEX: Record<Weekday, number> = {
  [Weekday.SUNDAY]: 0,
  [Weekday.MONDAY]: 1,
  [Weekday.TUESDAY]: 2,
  [Weekday.WEDNESDAY]: 3,
  [Weekday.THURSDAY]: 4,
  [Weekday.FRIDAY]: 5,
  [Weekday.SATURDAY]: 6,
};

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateForWeekdayInWeekRange(
  week: WeekRange,
  weekday: TermWeekdayKey,
  startingDay: Weekday,
) {
  const weekStart = weekStartForDate(week.start, startingDay);
  const start = new Date(`${weekStart}T00:00:00`);
  const targetIdx = WEEKDAY_TO_JS_INDEX[termWeekdayKeyToWeekday(weekday)] ?? 0;
  const startIdx = WEEKDAY_TO_JS_INDEX[startingDay] ?? 0;
  const offset = (targetIdx - startIdx + 7) % 7;
  const result = new Date(start);
  result.setDate(start.getDate() + offset);
  return formatLocalDate(result);
}

function normalizeTimeToApi(value: string) {
  const trimmed = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function courseComponentOptions(courses: SchemaCourseConfig[]) {
  const options: {
    value: string;
    label: string;
    courseIdx: number;
    componentIdx: number;
  }[] = [];

  for (const [courseIdx, course] of courses.entries()) {
    const title = String(course.short_name || course.name || "").trim() || "—";
    for (const [componentIdx, component] of (
      course.components || []
    ).entries()) {
      const tag = String(component.tag || "").trim() || "—";
      options.push({
        value: `${courseIdx}:${componentIdx}`,
        label: `${title} (${tag})`,
        courseIdx,
        componentIdx,
      });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

export function parseCourseComponentKey(value: string) {
  const [courseIdxRaw, componentIdxRaw] = value.split(":");
  const courseIdx = Number(courseIdxRaw);
  const componentIdx = Number(componentIdxRaw);
  if (!Number.isInteger(courseIdx) || !Number.isInteger(componentIdx))
    return null;
  if (courseIdx < 0 || componentIdx < 0) return null;
  return { courseIdx, componentIdx };
}

function courseUsesOccurrences(course: SchemaCourseConfig) {
  return (course.course_tags || []).includes("elective");
}

function seriesUsesOccurrences(
  course: SchemaCourseConfig,
  series: SchemaComponentSessionSeries,
) {
  if ((series.occurrences || []).length > 0) return true;
  if ((series.weekly_pattern || []).length > 0) return false;
  return courseUsesOccurrences(course);
}

function audienceForSeries(
  component: SchemaComponent,
  series: SchemaComponentSessionSeries,
  config: SchemaScheduleConfig,
) {
  const tree = buildAudienceSelectorTree(config);
  const explicit = series.audience || [];
  if (explicit.length) return minimizeAudienceTokens(explicit, tree);
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

function findOrCreateSessionSeries(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
): SchemaComponentSessionSeries {
  const tree = buildAudienceSelectorTree(config);
  const targetAudience = minimizeAudienceTokens(audience, tree);
  if (!component.sessions) component.sessions = [];

  for (const series of component.sessions) {
    if (
      meetingAudienceEqual(
        audienceForSeries(component, series, config),
        targetAudience,
      )
    ) {
      return series;
    }
  }

  const created: SchemaComponentSessionSeries = {
    audience: [...targetAudience],
    weekly_pattern: [],
    occurrences: [],
  };
  component.sessions.push(created);
  return created;
}

export function applyCreateMeetingToCourse(
  course: SchemaCourseConfig,
  config: SchemaScheduleConfig,
  draft: CreateMeetingDraft,
): SchemaCourseConfig | null {
  const component = course.components?.[draft.componentIdx];
  if (!component) return null;

  const nextCourse = structuredClone(course);
  const nextComponent = nextCourse.components?.[draft.componentIdx];
  if (!nextComponent) return null;

  const audience = minimizeAudienceTokens(
    draft.audience,
    buildAudienceSelectorTree(config),
  );
  if (!audience.length) return null;

  const series = findOrCreateSessionSeries(nextComponent, audience, config);
  const startTime = normalizeTimeToApi(draft.time);
  const endTime = resolveEndTimeForStart(config, startTime);
  const room = String(draft.room || "").trim() || null;
  const instructor = String(draft.instructor || "").trim() || null;

  if (seriesUsesOccurrences(nextCourse, series)) {
    if (!series.occurrences) series.occurrences = [];
    const occurrence: SchemaSessionOccurrence = {
      date: draft.date,
      start_time: startTime,
      end_time: endTime,
      room,
      instructor,
    };
    series.occurrences.push(occurrence);
    return nextCourse;
  }

  if (!series.weekly_pattern) series.weekly_pattern = [];
  const slot: SchemaWeeklyPatternSlot = {
    weekday: termWeekdayKeyToWeekday(draft.weekday),
    start_time: startTime,
    end_time: endTime,
    room,
    instructor,
  };
  series.weekly_pattern.push(slot);
  return nextCourse;
}
