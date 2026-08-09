import type {
  SchemaComponent,
  SchemaComponentSessionSeries,
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";

import {
  formatAudienceTokensLabel,
  parseMeetingInstanceId,
} from "./meetingEditUtils.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import { resolveInstructorLabel } from "./timetableViewerModel.ts";

export function resolveCourseAndComponent(
  config: SchemaScheduleConfig,
  meeting: Meeting,
): {
  course: SchemaCourseConfig | null;
  component: SchemaComponent | null;
} {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const courses = config.courses ?? [];

  if (ref) {
    const course = courses[ref.courseIdx] ?? null;
    const component = course?.components?.[ref.componentIdx] ?? null;
    if (course && component) return { course, component };
  }

  const course =
    courses.find((item) => String(item.name || "") === meeting.course) ?? null;
  const component =
    course?.components?.find(
      (item) =>
        String(item.tag || "").trim() === String(meeting.tag || "").trim(),
    ) ?? null;
  return { course, component };
}

export type ComponentPlacementCounts = {
  weeklySlots: number;
  occurrences: number;
  seriesCount: number;
};

export function countComponentPlacement(
  component: SchemaComponent | null | undefined,
): ComponentPlacementCounts {
  const sessions = component?.sessions ?? [];
  let weeklySlots = 0;
  let occurrences = 0;
  for (const series of sessions) {
    weeklySlots += series.weekly_pattern?.length ?? 0;
    occurrences += series.occurrences?.length ?? 0;
  }
  return {
    weeklySlots,
    occurrences,
    seriesCount: sessions.length,
  };
}

export function formatComponentTarget(
  component: SchemaComponent | null | undefined,
): string | null {
  if (component?.per_week != null) {
    return `${component.per_week} / неделю`;
  }
  if (component?.per_semester != null) {
    return `${component.per_semester} / семестр`;
  }
  return null;
}

export function formatComponentPlaced(
  counts: ComponentPlacementCounts,
): string | null {
  const parts: string[] = [];
  if (counts.weeklySlots) parts.push(`${counts.weeklySlots} слот.`);
  if (counts.occurrences) parts.push(`${counts.occurrences} дат`);
  if (!parts.length && counts.seriesCount) {
    parts.push(`${counts.seriesCount} сер.`);
  }
  return parts.length ? parts.join(", ") : null;
}

/**
 * Compact placed/target hint for sibling chips.
 * Only when a target exists — bare counts look like noise.
 */
export function formatComponentProgressHint(
  component: SchemaComponent,
): string {
  const counts = countComponentPlacement(component);
  if (component.per_week != null) {
    return `${counts.weeklySlots}/${component.per_week}`;
  }
  if (component.per_semester != null) {
    const placed = counts.occurrences || counts.weeklySlots;
    return `${placed}/${component.per_semester}`;
  }
  return "";
}

export function formatInstructorPoolEntries(
  pool: unknown[],
  resolveLabel: (id: string) => string,
): string[] {
  if (!pool?.length) return [];
  return pool.map((entry) => {
    if (Array.isArray(entry)) {
      return entry.map((id) => resolveLabel(String(id))).join(" + ");
    }
    return resolveLabel(String(entry));
  });
}

function flattenInstructorPoolIds(pool: unknown[]): string[] {
  const ids: string[] = [];
  for (const entry of pool) {
    if (Array.isArray(entry)) {
      for (const id of entry) {
        const value = String(id || "").trim();
        if (value) ids.push(value);
      }
      continue;
    }
    const value = String(entry || "").trim();
    if (value) ids.push(value);
  }
  return ids;
}

function meetingInstructorIds(instructors: string | string[]): string[] {
  if (typeof instructors === "string") {
    const value = instructors.trim();
    return value ? [value] : [];
  }
  return (instructors ?? [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
}

/** Show pool only when it offers alternatives beyond the assigned instructor(s). */
export function shouldShowInstructorPool(
  pool: unknown[] | null | undefined,
  assigned: string | string[],
): boolean {
  const poolIds = flattenInstructorPoolIds(pool ?? []);
  if (!poolIds.length) return false;

  const assignedIds = meetingInstructorIds(assigned);
  if (!assignedIds.length) return true;

  const poolSet = new Set(poolIds);
  const assignedSet = new Set(assignedIds);

  for (const id of assignedSet) {
    if (!poolSet.has(id)) return true;
  }

  for (const id of poolSet) {
    if (!assignedSet.has(id)) return true;
  }

  return poolIds.length > assignedIds.length;
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  if (left.size !== b.length) return false;
  return b.every((id) => left.has(id));
}

/** True when component default audience differs from this meeting's groups. */
export function componentAudienceDiffersFromMeeting(
  config: SchemaScheduleConfig,
  component: SchemaComponent | null | undefined,
  meetingGroupIds: string[],
): boolean {
  const tokens = (component?.student_groups ?? [])
    .map((token) => String(token || "").trim())
    .filter(Boolean);
  if (!tokens.length) return false;

  const expanded = expandStudentGroupSelectors(config, tokens);
  const meeting = meetingGroupIds
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  return !sameStringSet(expanded, meeting);
}

export function courseDisplayTitle(
  course: SchemaCourseConfig | null,
  meeting: Meeting,
): string {
  return (
    String(
      course?.name_ru ||
        course?.short_name_ru ||
        course?.name ||
        meeting.course_short_name ||
        meeting.course ||
        "",
    ).trim() || "—"
  );
}

export type ComponentSeriesNavItem = {
  seriesIdx: number;
  label: string;
  secondary?: string;
  meeting: Meeting;
  isCurrent: boolean;
};

function pickSeriesRepresentative(
  ofSeries: Meeting[],
  current: Meeting,
): Meeting | null {
  if (!ofSeries.length) return null;
  const sameDate = ofSeries.filter((item) => item.date === current.date);
  const pool = sameDate.length ? sameDate : ofSeries;
  return [...pool].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate) return byDate;
    return a.start.localeCompare(b.start);
  })[0]!;
}

function seriesAudienceTokens(
  component: SchemaComponent,
  series: { audience?: string[] },
  representative: Meeting,
): string[] {
  if (series.audience?.length) {
    return series.audience
      .map((token) => String(token || "").trim())
      .filter(Boolean);
  }
  if (representative.groups?.length) {
    return representative.groups.map(String);
  }
  return (component.student_groups ?? [])
    .map((token) => String(token || "").trim())
    .filter(Boolean);
}

function formatSeriesScheduleKind(
  series: SchemaComponentSessionSeries,
): string | undefined {
  const occCount = (series.occurrences ?? []).filter((occurrence) =>
    String(occurrence.date || "").trim(),
  ).length;
  if (occCount > 0) {
    return occCount === 1 ? "1 дата" : `${occCount} дат`;
  }
  if ((series.weekly_pattern ?? []).length > 0) {
    return "Еженедельно";
  }
  return undefined;
}

function formatSeriesSecondary(
  meeting: Meeting,
  instructorLabelById: Record<string, string>,
  series?: SchemaComponentSessionSeries,
): string | undefined {
  const parts: string[] = [];
  if (series) {
    const kind = formatSeriesScheduleKind(series);
    if (kind) parts.push(kind);
  }
  if (meeting.start) {
    parts.push(meeting.end ? `${meeting.start}–${meeting.end}` : meeting.start);
  }
  const instructor = (() => {
    const list =
      typeof meeting.instructors === "string"
        ? meeting.instructors.trim()
          ? [meeting.instructors]
          : []
        : (meeting.instructors ?? []);
    if (!list.length) return "";
    return list
      .map((id) => resolveInstructorLabel(String(id), instructorLabelById))
      .join(", ");
  })();
  if (instructor) parts.push(instructor);
  const room = String(meeting.room || "").trim();
  if (room) parts.push(room);
  return parts.length ? parts.join(" · ") : undefined;
}

/** Other session series of the selected meeting's component (for sidebar navigation). */
export function listComponentSeriesNavItems(
  config: SchemaScheduleConfig,
  meeting: Meeting,
  allMeetings: Meeting[],
  instructorLabelById: Record<string, string> = {},
): ComponentSeriesNavItem[] {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref) return [];
  return listComponentSeriesNavItemsForRef(
    config,
    allMeetings,
    ref.courseIdx,
    ref.componentIdx,
    meeting,
    instructorLabelById,
  );
}

export function findMeetingForComponent(
  allMeetings: Meeting[],
  courseIdx: number,
  componentIdx: number,
  prefer?: Meeting | null,
): Meeting | null {
  if (prefer) {
    const preferRef = parseMeetingInstanceId(prefer.instance_id);
    if (
      preferRef?.courseIdx === courseIdx &&
      preferRef?.componentIdx === componentIdx
    ) {
      return prefer;
    }
  }
  for (const candidate of allMeetings) {
    const candidateRef = parseMeetingInstanceId(candidate.instance_id);
    if (!candidateRef) continue;
    if (candidateRef.courseIdx !== courseIdx) continue;
    if (candidateRef.componentIdx !== componentIdx) continue;
    return candidate;
  }
  return null;
}

export function listComponentSeriesNavItemsForRef(
  config: SchemaScheduleConfig,
  allMeetings: Meeting[],
  courseIdx: number,
  componentIdx: number,
  currentMeeting: Meeting | null,
  instructorLabelById: Record<string, string> = {},
): ComponentSeriesNavItem[] {
  const course = config.courses?.[courseIdx];
  const component = course?.components?.[componentIdx];
  const sessions = component?.sessions ?? [];
  if (!sessions.length) return [];

  const currentRef = currentMeeting
    ? parseMeetingInstanceId(currentMeeting.instance_id)
    : null;
  const anchor =
    currentMeeting &&
    currentRef?.courseIdx === courseIdx &&
    currentRef?.componentIdx === componentIdx
      ? currentMeeting
      : findMeetingForComponent(allMeetings, courseIdx, componentIdx);

  if (!anchor) return [];

  const bySeries = new Map<number, Meeting[]>();
  for (const candidate of allMeetings) {
    const candidateRef = parseMeetingInstanceId(candidate.instance_id);
    if (!candidateRef) continue;
    if (candidateRef.courseIdx !== courseIdx) continue;
    if (candidateRef.componentIdx !== componentIdx) continue;
    const list = bySeries.get(candidateRef.seriesIdx) ?? [];
    list.push(candidate);
    bySeries.set(candidateRef.seriesIdx, list);
  }

  const items: ComponentSeriesNavItem[] = [];
  const usedLabels = new Map<string, number>();
  const currentSeriesIdx =
    currentRef?.courseIdx === courseIdx &&
    currentRef?.componentIdx === componentIdx
      ? currentRef.seriesIdx
      : -1;

  for (const [seriesIdx, series] of sessions.entries()) {
    const representative = pickSeriesRepresentative(
      bySeries.get(seriesIdx) ?? [],
      anchor,
    );
    if (!representative) continue;

    const tokens = seriesAudienceTokens(component!, series, representative);
    let label = formatAudienceTokensLabel(config, tokens);
    if (!label || label === "—") {
      label = `Серия ${seriesIdx + 1}`;
    }
    usedLabels.set(label, (usedLabels.get(label) ?? 0) + 1);

    items.push({
      seriesIdx,
      label,
      secondary: formatSeriesSecondary(
        representative,
        instructorLabelById,
        series,
      ),
      meeting: representative,
      isCurrent: seriesIdx === currentSeriesIdx,
    });
  }

  return items.map((item) => {
    if ((usedLabels.get(item.label) ?? 0) <= 1) return item;
    if (!item.secondary) {
      return { ...item, label: `${item.label} · #${item.seriesIdx + 1}` };
    }
    return item;
  });
}
