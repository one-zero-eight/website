import type {
  SchemaComponent,
  SchemaComponentSessionSeries,
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import {
  TERM_WEEKDAY_LABEL_RU,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  formatAudienceTokensLabel,
  parseMeetingInstanceId,
} from "./meetingEditUtils.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import {
  dayKey,
  formatDisplayDate,
  resolveInstructorLabel,
  weekdayLabelRu,
} from "./timetableViewerModel.ts";

function formatScheduleDateTimeParts(
  dateIso: string,
  time: string,
): {
  primary: string;
  primaryDate?: string;
  primaryWeekday?: string;
  primaryTime?: string;
} {
  const iso = dateIso.trim();
  const weekday = iso ? weekdayLabelRu(dayKey(iso)) : "";
  const dateLabel = iso ? formatDisplayDate(iso, { withYear: false }) : "—";
  const joined = (() => {
    if (!weekday && !time) return dateLabel;
    if (!time) return `${dateLabel}, ${weekday}`;
    if (!weekday) return `${dateLabel} ${time}`;
    return `${dateLabel}, ${weekday} ${time}`;
  })();

  return {
    primary: joined,
    primaryDate: dateLabel === "—" && !iso ? undefined : dateLabel,
    primaryWeekday: weekday || undefined,
    primaryTime: time || undefined,
  };
}

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
  const placed = counts.weeklySlots + counts.occurrences || counts.seriesCount;
  if (!placed) return null;
  return `размещено ${placed} ${pluralizeZanyatiya(placed)}`;
}

function pluralizeZanyatiya(n: number): string {
  return pluralizeRu(n, "занятие", "занятия", "занятий");
}

function pluralizeDaty(n: number): string {
  return pluralizeRu(n, "дата", "даты", "дат");
}

function pluralizeSloty(n: number): string {
  return pluralizeRu(n, "слот", "слота", "слотов");
}

function pluralizeRu(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
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

export type ComponentSeriesTooltipItem = {
  primary: string;
  /** Structured primary for aligned date / weekday / time columns. */
  primaryDate?: string;
  primaryWeekday?: string;
  primaryTime?: string;
  secondary?: string;
  isCurrent?: boolean;
  /** Index in weekly_pattern / occurrences before sorting. */
  sourceIdx?: number;
  /** When set, row can navigate to this meeting on the timetable. */
  meeting?: Meeting;
};

export type ComponentSeriesDisplayItem = {
  seriesIdx: number;
  label: string;
  secondary?: string;
  /** Rows shown on hover over secondary (e.g. each occurrence). */
  secondaryTooltipItems?: ComponentSeriesTooltipItem[];
  isCurrent?: boolean;
  meeting?: Meeting;
};

export type ComponentSeriesNavItem = ComponentSeriesDisplayItem & {
  meeting: Meeting;
};

export function formatMeetingSchedulePrimary(meeting: Meeting): string {
  return formatMeetingSchedulePrimaryParts(meeting).primary;
}

export function formatMeetingSchedulePrimaryParts(meeting: Meeting): {
  primary: string;
  primaryDate?: string;
  primaryWeekday?: string;
  primaryTime?: string;
} {
  const iso = String(meeting.date || "").trim();
  const time = meeting.start
    ? meeting.end
      ? `${meeting.start}–${meeting.end}`
      : meeting.start
    : "";
  return formatScheduleDateTimeParts(iso, time);
}

export function formatMeetingScheduleSecondary(
  meeting: Meeting,
  instructorLabelById: Record<string, string>,
): string | undefined {
  const parts: string[] = [];
  const list =
    typeof meeting.instructors === "string"
      ? meeting.instructors.trim()
        ? [meeting.instructors]
        : []
      : (meeting.instructors ?? []);
  if (list.length) {
    parts.push(
      list
        .map((id) => resolveInstructorLabel(String(id), instructorLabelById))
        .join(", "),
    );
  }
  const room = String(meeting.room || "").trim();
  if (room) parts.push(room);
  return parts.length ? parts.join(" · ") : undefined;
}

export function meetingToScheduleTooltipItem(
  meeting: Meeting,
  instructorLabelById: Record<string, string>,
  isCurrent = false,
): ComponentSeriesTooltipItem {
  const parts = formatMeetingSchedulePrimaryParts(meeting);
  return {
    ...parts,
    secondary: formatMeetingScheduleSecondary(meeting, instructorLabelById),
    isCurrent,
    meeting,
  };
}

function attachMeetingsToTooltipItems(
  items: ComponentSeriesTooltipItem[] | undefined,
  ofSeries: Meeting[],
  seriesIdx: number,
): ComponentSeriesTooltipItem[] | undefined {
  if (!items?.length) return items;
  return items.map((item) => {
    if (item.sourceIdx == null) return item;
    const match =
      ofSeries.find((candidate) => {
        const ref = parseMeetingInstanceId(candidate.instance_id);
        if (!ref || ref.seriesIdx !== seriesIdx) return false;
        if (ref.kind === "occ") return ref.occIdx === item.sourceIdx;
        if (ref.kind === "wp") return ref.slotIdx === item.sourceIdx;
        return false;
      }) ?? undefined;
    return match ? { ...item, meeting: match } : item;
  });
}

export function listComponentSeriesDisplayItems(
  config: SchemaScheduleConfig,
  component: SchemaComponent,
  instructorLabelById: Record<string, string> = {},
): ComponentSeriesDisplayItem[] {
  const sessions = component.sessions ?? [];
  if (!sessions.length) return [];

  const usedLabels = new Map<string, number>();
  const items: ComponentSeriesDisplayItem[] = [];
  const resolveLabel = (id: string) =>
    resolveInstructorLabel(id, instructorLabelById);

  for (const [seriesIdx, series] of sessions.entries()) {
    const tokens = series.audience?.length
      ? series.audience
          .map((token) => String(token || "").trim())
          .filter(Boolean)
      : (component.student_groups ?? [])
          .map((token) => String(token || "").trim())
          .filter(Boolean);

    let label = formatAudienceTokensLabel(config, tokens);
    if (!label || label === "—") {
      label = `Серия ${seriesIdx + 1}`;
    }
    usedLabels.set(label, (usedLabels.get(label) ?? 0) + 1);

    const secondaryInfo = seriesSecondaryFromConfig(series, resolveLabel);
    items.push({
      seriesIdx,
      label,
      secondary: secondaryInfo.secondary,
      secondaryTooltipItems: secondaryInfo.secondaryTooltipItems,
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

function toUiTime(value: string | null | undefined): string {
  return String(value || "").slice(0, 5);
}

function weekdayKeyFromApi(weekday: string | null | undefined): TermWeekdayKey {
  const lowered = String(weekday || "")
    .trim()
    .toLowerCase();
  const map: Record<string, TermWeekdayKey> = {
    monday: "Mon",
    mon: "Mon",
    tuesday: "Tue",
    tue: "Tue",
    wednesday: "Wed",
    wed: "Wed",
    thursday: "Thu",
    thu: "Thu",
    friday: "Fri",
    fri: "Fri",
    saturday: "Sat",
    sat: "Sat",
    sunday: "Sun",
    sun: "Sun",
  };
  if (map[lowered]) return map[lowered];
  if (
    (Object.keys(TERM_WEEKDAY_LABEL_RU) as string[]).includes(String(weekday))
  ) {
    return String(weekday) as TermWeekdayKey;
  }
  return "Mon";
}

function formatInstructorField(
  instructor: string | string[] | null | undefined,
  resolveLabel: (id: string) => string,
): string {
  const ids = Array.isArray(instructor)
    ? instructor
    : instructor
      ? [instructor]
      : [];
  return ids
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .map(resolveLabel)
    .join(", ");
}

function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const startUi = toUiTime(start);
  if (!startUi) return "";
  const endUi = toUiTime(end);
  return endUi ? `${startUi}–${endUi}` : startUi;
}

function formatSingleWeeklySlot(
  slot: SchemaWeeklyPatternSlot,
  resolveLabel: (id: string) => string,
): string {
  const item = formatWeeklySlotTooltipItem(slot, resolveLabel);
  return [item.primary, item.secondary].filter(Boolean).join(" · ");
}

function formatWeeklySlotTooltipItem(
  slot: SchemaWeeklyPatternSlot,
  resolveLabel: (id: string) => string,
): ComponentSeriesTooltipItem {
  const day = TERM_WEEKDAY_LABEL_RU[weekdayKeyFromApi(slot.weekday)];
  const time = formatTimeRange(slot.start_time, slot.end_time);
  const primary = day && time ? `${day} ${time}` : day || time || "Слот";
  const previewParts: string[] = [];
  const instructor = formatInstructorField(slot.instructor, resolveLabel);
  if (instructor) previewParts.push(instructor);
  const room = String(slot.room || "").trim();
  if (room) previewParts.push(room);
  return {
    primary,
    secondary: previewParts.length ? previewParts.join(" · ") : undefined,
  };
}

function formatSingleOccurrence(
  occurrence: SchemaSessionOccurrence,
  resolveLabel: (id: string) => string,
): string {
  const item = formatOccurrenceTooltipItem(occurrence, resolveLabel);
  return [item.primary, item.secondary].filter(Boolean).join(" · ");
}

function formatOccurrenceTooltipItem(
  occurrence: SchemaSessionOccurrence,
  resolveLabel: (id: string) => string,
): ComponentSeriesTooltipItem {
  const date = String(occurrence.date || "").trim();
  const time = formatTimeRange(occurrence.start_time, occurrence.end_time);
  const parts = formatScheduleDateTimeParts(date, time);
  const previewParts: string[] = [];
  const instructor = formatInstructorField(occurrence.instructor, resolveLabel);
  if (instructor) previewParts.push(instructor);
  const room = String(occurrence.room || "").trim();
  if (room) previewParts.push(room);
  return {
    ...parts,
    primary: parts.primary || time || "Дата",
    secondary: previewParts.length ? previewParts.join(" · ") : undefined,
  };
}

function seriesSecondaryFromConfig(
  series: SchemaComponentSessionSeries,
  resolveLabel: (id: string) => string = (id) => id,
): {
  secondary?: string;
  secondaryTooltipItems?: ComponentSeriesTooltipItem[];
} {
  const occurrences = (series.occurrences ?? [])
    .map((occurrence, sourceIdx) => ({ occurrence, sourceIdx }))
    .filter(({ occurrence }) => String(occurrence.date || "").trim())
    .sort((a, b) =>
      String(a.occurrence.date).localeCompare(String(b.occurrence.date)),
    );
  const weekly = series.weekly_pattern ?? [];

  if (occurrences.length > 0) {
    if (occurrences.length === 1) {
      return {
        secondary:
          formatSingleOccurrence(occurrences[0]!.occurrence, resolveLabel) ||
          "1 дата",
      };
    }
    return {
      secondary: `${occurrences.length} ${pluralizeDaty(occurrences.length)}`,
      secondaryTooltipItems: occurrences.map(({ occurrence, sourceIdx }) => ({
        ...formatOccurrenceTooltipItem(occurrence, resolveLabel),
        sourceIdx,
      })),
    };
  }

  if (weekly.length > 0) {
    if (weekly.length === 1) {
      return {
        secondary: formatSingleWeeklySlot(weekly[0]!, resolveLabel) || "1 слот",
      };
    }
    return {
      secondary: `${weekly.length} ${pluralizeSloty(weekly.length)}`,
      secondaryTooltipItems: weekly.map((slot, sourceIdx) => ({
        ...formatWeeklySlotTooltipItem(slot, resolveLabel),
        sourceIdx,
      })),
    };
  }

  return {};
}

function markCurrentTooltipItems(
  items: ComponentSeriesTooltipItem[] | undefined,
  currentSourceIdx: number | null,
): ComponentSeriesTooltipItem[] | undefined {
  if (!items?.length || currentSourceIdx == null) return items;
  return items.map((item) => ({
    ...item,
    isCurrent: item.sourceIdx === currentSourceIdx,
  }));
}

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
  if (occCount > 1) {
    return `${occCount} ${pluralizeDaty(occCount)}`;
  }
  if (occCount === 1) {
    return undefined;
  }
  const weekly = series.weekly_pattern ?? [];
  if (weekly.length === 1) {
    return TERM_WEEKDAY_LABEL_RU[weekdayKeyFromApi(weekly[0]!.weekday)];
  }
  if (weekly.length > 1) {
    return `${weekly.length} ${pluralizeSloty(weekly.length)}`;
  }
  return undefined;
}

function formatSeriesSecondary(
  meeting: Meeting,
  instructorLabelById: Record<string, string>,
  series?: SchemaComponentSessionSeries,
): string | undefined {
  if (series) {
    const occCount = (series.occurrences ?? []).filter((occurrence) =>
      String(occurrence.date || "").trim(),
    ).length;
    const weeklyCount = (series.weekly_pattern ?? []).length;
    // Multi-date / multi-slot: only the count; details live in tooltip.
    if (occCount > 1) return `${occCount} ${pluralizeDaty(occCount)}`;
    if (weeklyCount > 1) return `${weeklyCount} ${pluralizeSloty(weeklyCount)}`;
  }

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

    const resolveLabel = (id: string) =>
      resolveInstructorLabel(id, instructorLabelById);
    const secondaryInfo = seriesSecondaryFromConfig(series, resolveLabel);
    const currentSourceIdx =
      seriesIdx === currentSeriesIdx && currentRef
        ? currentRef.kind === "occ"
          ? currentRef.occIdx
          : currentRef.slotIdx
        : null;
    items.push({
      seriesIdx,
      label,
      secondary: formatSeriesSecondary(
        representative,
        instructorLabelById,
        series,
      ),
      secondaryTooltipItems: attachMeetingsToTooltipItems(
        markCurrentTooltipItems(
          secondaryInfo.secondaryTooltipItems,
          currentSourceIdx,
        ),
        bySeries.get(seriesIdx) ?? [],
        seriesIdx,
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
