import type {
  SchemaComponent,
  SchemaComponentSessionSeries,
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  audienceTokensEquivalent,
  resolveEndTimeForStart,
  timeOptionsForConfig,
} from "./meetingEditUtils.ts";
import {
  instructorPickerDatesForWeekday,
  suggestBestInstructorId,
} from "./instructorPickerOptions.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import {
  roomPickerDatesForEdit,
  suggestBestRoomId,
} from "./roomPickerOptions.ts";
import type { TimetableLayoutMode } from "./TimetableLayoutSelector.tsx";
import type { Meeting, WeekRange } from "./timetableViewerModel.ts";
import { weekStartForDate } from "./timetableViewerModel.ts";

function toApiTime(value: string): string {
  const trimmed = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export type CreateMeetingCellContext = {
  weekday: TermWeekdayKey;
  time: string;
  date: string;
  groupId?: string;
};

export type CreateMeetingViewContext = {
  sectionCode?: string;
  groupId?: string;
};

export type CreateMeetingPreset = {
  courseIdx: number;
  componentIdx: number;
  audience: string[];
};

export type CreatePlacement = "weekly" | "occurrences";

export type ComponentScheduleStatus = "empty" | "partial" | "covered";

export type CreateSeriesAction = "append" | "create";

export type CourseComponentCreateOption = {
  value: string;
  label: string;
  courseIdx: number;
  componentIdx: number;
  perGroup: boolean;
  status: ComponentScheduleStatus;
  statusLabel: string;
  modeLabel: string;
  seriesAction: CreateSeriesAction;
  searchText: string;
};

export type CreateMeetingDraft = {
  courseIdx: number;
  componentIdx: number;
  audience: string[];
  placement: CreatePlacement;
  weeklySlots?: SchemaWeeklyPatternSlot[];
  occurrences?: SchemaSessionOccurrence[];
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

const STATUS_RANK: Record<ComponentScheduleStatus, number> = {
  empty: 0,
  partial: 1,
  covered: 2,
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

function audienceForSeries(
  component: SchemaComponent,
  series: SchemaComponentSessionSeries,
  config: SchemaScheduleConfig,
  sectionCode: string,
) {
  const tree = buildAudienceSelectorTree(config, { sectionCode });
  const explicit = series.audience || [];
  if (explicit.length) return minimizeAudienceTokens(explicit, tree);
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

export function expandedAudience(
  config: SchemaScheduleConfig,
  tokens: string[],
): string[] {
  return [
    ...new Set(
      expandStudentGroupSelectors(config, tokens).map((item) =>
        String(item || "").trim(),
      ),
    ),
  ].filter(Boolean);
}

function seriesCoversGroup(
  component: SchemaComponent,
  series: SchemaComponentSessionSeries,
  config: SchemaScheduleConfig,
  groupId: string,
  sectionCode: string,
) {
  return expandedAudience(
    config,
    audienceForSeries(component, series, config, sectionCode),
  ).includes(groupId);
}

function seriesAudienceMatches(
  component: SchemaComponent,
  series: SchemaComponentSessionSeries,
  config: SchemaScheduleConfig,
  sectionCode: string,
  audience: string[],
) {
  return audienceTokensEquivalent(
    config,
    audienceForSeries(component, series, config, sectionCode),
    audience,
  );
}

/** Sessions whose expanded audience equals `audience`. */
function sessionsMatchingAudience(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  sectionCode: string,
  audience: string[],
) {
  const target = expandedAudience(config, audience);
  if (!target.length) return [];
  return (component.sessions || []).filter((series) =>
    seriesAudienceMatches(component, series, config, sectionCode, audience),
  );
}

function relevantSessionsForProgress(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  sectionCode: string,
  focusGroupId?: string,
) {
  if (component.per_group && focusGroupId) {
    return (component.sessions || []).filter((series) =>
      seriesCoversGroup(component, series, config, focusGroupId, sectionCode),
    );
  }
  if (!component.per_group) {
    return sessionsMatchingAudience(
      component,
      config,
      sectionCode,
      component.student_groups || [],
    );
  }
  return component.sessions || [];
}

function seriesHasPlacement(series: SchemaComponentSessionSeries) {
  return (
    (series.weekly_pattern?.length ?? 0) > 0 ||
    (series.occurrences?.length ?? 0) > 0
  );
}

function weeklySlotCount(sessions: SchemaComponentSessionSeries[]) {
  return sessions.reduce(
    (sum, series) => sum + (series.weekly_pattern?.length ?? 0),
    0,
  );
}

function occurrenceCount(sessions: SchemaComponentSessionSeries[]) {
  return sessions.reduce(
    (sum, series) => sum + (series.occurrences?.length ?? 0),
    0,
  );
}

export function defaultAudienceForCreate(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  sectionCode: string,
  cellGroupId?: string,
): string[] {
  const tree = buildAudienceSelectorTree(config, { sectionCode });
  if (component.per_group) {
    const pool = expandedAudience(config, component.student_groups || []);
    const poolSet = new Set(pool);
    if (cellGroupId && poolSet.has(cellGroupId)) {
      return minimizeAudienceTokens([cellGroupId], tree);
    }
    if (pool.length === 1) {
      return minimizeAudienceTokens([pool[0]!], tree);
    }
    return [];
  }
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

/**
 * Find an existing session series to attach to, without creating.
 * Shared components attach to the component-level series even when the draft
 * audience is a single group from the grid cell.
 */
export function findMatchingSessionSeries(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
  sectionCode: string,
): SchemaComponentSessionSeries | null {
  const tree = buildAudienceSelectorTree(config, { sectionCode });
  const targetAudience = minimizeAudienceTokens(audience, tree);
  if (!targetAudience.length) return null;

  const sessions = component.sessions || [];
  if (!sessions.length) return null;

  for (const series of sessions) {
    if (
      audienceTokensEquivalent(
        config,
        audienceForSeries(component, series, config, sectionCode),
        targetAudience,
      )
    ) {
      return series;
    }
  }

  const targetExpanded = expandedAudience(config, targetAudience);

  if (component.per_group && targetExpanded.length === 1) {
    const groupId = targetExpanded[0]!;
    for (const series of sessions) {
      const expanded = expandedAudience(
        config,
        audienceForSeries(component, series, config, sectionCode),
      );
      if (expanded.length === 1 && expanded[0] === groupId) return series;
    }
    // Do not append to a shared/superset series: that would add the new slot
    // for every group in the series and show their existing rows in the modal.
    return null;
  }

  if (!component.per_group) {
    const componentTokens = component.student_groups || [];
    const componentExpanded = expandedAudience(config, componentTokens);
    const targetIsSubset =
      targetExpanded.length > 0 &&
      targetExpanded.every((groupId) => componentExpanded.includes(groupId));
    if (!targetIsSubset && componentExpanded.length) return null;

    for (const series of sessions) {
      if (
        audienceTokensEquivalent(
          config,
          audienceForSeries(component, series, config, sectionCode),
          componentTokens,
        )
      ) {
        return series;
      }
    }
  }

  return null;
}

/** Slots from series that cover the audience but are not `exclude` (shared labs). */
export function coveringSeriesSlots(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
  sectionCode: string,
  exclude: SchemaComponentSessionSeries | null,
): {
  weekly: SchemaWeeklyPatternSlot[];
  occurrences: SchemaSessionOccurrence[];
  weeklyRefs: { seriesIdx: number; slotIdx: number }[];
  occurrenceRefs: { seriesIdx: number; occIdx: number }[];
} {
  const target = expandedAudience(config, audience);
  const weekly: SchemaWeeklyPatternSlot[] = [];
  const occurrences: SchemaSessionOccurrence[] = [];
  const weeklyRefs: { seriesIdx: number; slotIdx: number }[] = [];
  const occurrenceRefs: { seriesIdx: number; occIdx: number }[] = [];
  if (!target.length) {
    return { weekly, occurrences, weeklyRefs, occurrenceRefs };
  }

  const sessions = component.sessions || [];
  sessions.forEach((series, seriesIdx) => {
    if (exclude != null && series === exclude) return;
    const expanded = expandedAudience(
      config,
      audienceForSeries(component, series, config, sectionCode),
    );
    if (!target.some((groupId) => expanded.includes(groupId))) return;
    (series.weekly_pattern || []).forEach((slot, slotIdx) => {
      weekly.push(slot);
      weeklyRefs.push({ seriesIdx, slotIdx });
    });
    (series.occurrences || []).forEach((occurrence, occIdx) => {
      occurrences.push(occurrence);
      occurrenceRefs.push({ seriesIdx, occIdx });
    });
  });
  return { weekly, occurrences, weeklyRefs, occurrenceRefs };
}

function seriesAudienceForCreate(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
  sectionCode: string,
): string[] {
  const tree = buildAudienceSelectorTree(config, { sectionCode });
  if (component.per_group) {
    return minimizeAudienceTokens(audience, tree);
  }
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

function findOrCreateSessionSeries(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
  sectionCode: string,
): SchemaComponentSessionSeries {
  const matched = findMatchingSessionSeries(
    component,
    audience,
    config,
    sectionCode,
  );
  if (matched) return matched;

  if (!component.sessions) component.sessions = [];
  const created: SchemaComponentSessionSeries = {
    audience: seriesAudienceForCreate(component, audience, config, sectionCode),
    weekly_pattern: [],
    occurrences: [],
  };
  component.sessions.push(created);
  return created;
}

export function previewCreateSeriesAction(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
  sectionCode: string,
): CreateSeriesAction {
  return findMatchingSessionSeries(component, audience, config, sectionCode)
    ? "append"
    : "create";
}

export function componentScheduleStatus(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  sectionCode: string,
  focusGroupId?: string,
): ComponentScheduleStatus {
  if (component.per_group && !focusGroupId) {
    const pool = expandedAudience(config, component.student_groups || []);
    if (pool.length) {
      const statuses = pool.map((groupId) =>
        componentScheduleStatus(component, config, sectionCode, groupId),
      );
      if (statuses.every((status) => status === "covered")) return "covered";
      if (statuses.every((status) => status === "empty")) return "empty";
      return "partial";
    }
  }

  const relevant = relevantSessionsForProgress(
    component,
    config,
    sectionCode,
    focusGroupId,
  );

  if (!relevant.some(seriesHasPlacement)) return "empty";

  const perWeek = component.per_week;
  if (perWeek != null && perWeek > 0) {
    const weekly = weeklySlotCount(relevant);
    if (weekly >= perWeek) return "covered";
    return "partial";
  }

  const perSemester = component.per_semester;
  if (perSemester != null && perSemester > 0) {
    const placed = weeklySlotCount(relevant) + occurrenceCount(relevant);
    if (placed >= perSemester) return "covered";
    return "partial";
  }

  return "covered";
}

export function componentScheduleStatusLabel(
  status: ComponentScheduleStatus,
): string {
  if (status === "empty") return "не расставлено";
  if (status === "partial") return "частично расставлено";
  return "всё расставлено";
}

/** Placed/target for a component, optionally scoped to one per_group audience. */
export function componentProgressHint(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  sectionCode: string,
  focusGroupId?: string,
): string {
  const relevant = relevantSessionsForProgress(
    component,
    config,
    sectionCode,
    focusGroupId,
  );

  let weekly = 0;
  let occurrences = 0;
  for (const series of relevant) {
    weekly += series.weekly_pattern?.length ?? 0;
    occurrences += series.occurrences?.length ?? 0;
  }

  if (component.per_week != null) return `${weekly}/${component.per_week}`;
  if (component.per_semester != null) {
    return `${occurrences || weekly}/${component.per_semester}`;
  }
  return "";
}

export function courseComponentOptions(
  courses: SchemaCourseConfig[],
  config?: SchemaScheduleConfig,
  view?: CreateMeetingViewContext,
): CourseComponentCreateOption[] {
  const options: CourseComponentCreateOption[] = [];
  const focusGroupId = view?.groupId;

  for (const [courseIdx, course] of courses.entries()) {
    if (view?.sectionCode && course.section_code !== view.sectionCode) {
      continue;
    }
    const title = String(course.short_name || course.name || "").trim() || "—";
    for (const [componentIdx, component] of (
      course.components || []
    ).entries()) {
      const tag = String(component.tag || "").trim() || "—";
      const perGroup = Boolean(component.per_group);
      const status = config
        ? componentScheduleStatus(
            component,
            config,
            course.section_code,
            focusGroupId,
          )
        : "empty";
      const audience = config
        ? defaultAudienceForCreate(
            component,
            config,
            course.section_code,
            focusGroupId,
          )
        : [];
      const seriesAction =
        config && audience.length
          ? previewCreateSeriesAction(
              component,
              audience,
              config,
              course.section_code,
            )
          : "create";
      const statusLabel = componentScheduleStatusLabel(status);
      const modeLabel = perGroup ? "по группам" : "";

      options.push({
        value: `${courseIdx}:${componentIdx}`,
        label: `${title} (${tag})`,
        courseIdx,
        componentIdx,
        perGroup,
        status,
        statusLabel,
        modeLabel,
        seriesAction,
        searchText: [title, tag, course.name, modeLabel, statusLabel]
          .filter(Boolean)
          .join(" "),
      });
    }
  }

  return options.sort((a, b) => {
    if (a.status !== b.status) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    return a.label.localeCompare(b.label, "ru");
  });
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

function placementFromLayout(layoutMode: TimetableLayoutMode): CreatePlacement {
  return layoutMode === "calendar" ? "occurrences" : "weekly";
}

function seriesPlacement(
  series: SchemaComponentSessionSeries,
): CreatePlacement | null {
  if ((series.occurrences || []).length > 0) return "occurrences";
  if ((series.weekly_pattern || []).length > 0) return "weekly";
  return null;
}

/**
 * Default create placement: existing matching series wins, else layout
 * (По дням → occurrences, По группам → weekly).
 */
export function defaultCreatePlacement(
  course: SchemaCourseConfig | null | undefined,
  componentIdx: number | null | undefined,
  audience: string[],
  config: SchemaScheduleConfig,
  layoutMode: TimetableLayoutMode,
): CreatePlacement {
  const layoutDefault = placementFromLayout(layoutMode);
  if (!course || componentIdx == null || componentIdx < 0) return layoutDefault;
  const component = course.components?.[componentIdx];
  if (!component) return layoutDefault;
  if (!audience.length) return layoutDefault;

  const matched = findMatchingSessionSeries(
    component,
    audience,
    config,
    course.section_code,
  );
  if (matched) return seriesPlacement(matched) ?? layoutDefault;
  return layoutDefault;
}

/** Whether create would add a single occurrence (vs weekly pattern). */
export function createWouldUseOccurrences(
  course: SchemaCourseConfig | null | undefined,
  componentIdx: number | null | undefined,
  audience: string[],
  config: SchemaScheduleConfig,
  layoutMode: TimetableLayoutMode,
): boolean {
  return (
    defaultCreatePlacement(
      course,
      componentIdx,
      audience,
      config,
      layoutMode,
    ) === "occurrences"
  );
}

export function seedOccurrenceFromCell(
  config: SchemaScheduleConfig,
  cell: CreateMeetingCellContext,
  audienceGroups?: string[],
): SchemaSessionOccurrence {
  const groups = audienceGroups?.length
    ? audienceGroups
    : cell.groupId
      ? [cell.groupId]
      : undefined;
  const options = timeOptionsForConfig(config, groups);
  const preset = options.find((slot) => slot.value === cell.time);
  const start = cell.time || options[0]?.value || "09:00";
  const end =
    preset?.end || resolveEndTimeForStart(config, start, groups).slice(0, 5);
  return {
    date: cell.date,
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: null,
    instructor: null,
  };
}

export function seedWeeklyFromCell(
  config: SchemaScheduleConfig,
  cell: CreateMeetingCellContext,
  audienceGroups?: string[],
): SchemaWeeklyPatternSlot {
  const groups = audienceGroups?.length
    ? audienceGroups
    : cell.groupId
      ? [cell.groupId]
      : undefined;
  const options = timeOptionsForConfig(config, groups);
  const preset = options.find((slot) => slot.value === cell.time);
  const start = cell.time || options[0]?.value || "09:00";
  const end =
    preset?.end || resolveEndTimeForStart(config, start, groups).slice(0, 5);
  return {
    weekday: termWeekdayKeyToWeekday(cell.weekday),
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: null,
    instructor: null,
    edits: null,
  };
}

export type PlacementResourceSuggestion = {
  room: string | null;
  instructor: string | null;
};

/** Best free room + instructor for a place-preview / create seed cell. */
export function suggestPlacementResources({
  config,
  meetings,
  index,
  cell,
  course,
  componentIdx,
  audience,
  layoutMode,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  index?: MeetingPickerIndex | null;
  cell: CreateMeetingCellContext;
  course: SchemaCourseConfig;
  componentIdx: number;
  audience: string[];
  layoutMode: TimetableLayoutMode;
}): PlacementResourceSuggestion {
  const component = course.components?.[componentIdx];
  if (!component || !audience.length) {
    return { room: null, instructor: null };
  }

  const placement = defaultCreatePlacement(
    course,
    componentIdx,
    audience,
    config,
    layoutMode,
  );
  const groupIds = expandedAudience(config, audience);
  const weekday = cell.weekday;

  if (placement === "occurrences") {
    const occurrence = seedOccurrenceFromCell(config, cell, groupIds);
    const start = String(occurrence.start_time || "").slice(0, 5);
    const end = String(occurrence.end_time || "").slice(0, 5);
    const date = String(occurrence.date || cell.date).trim();
    if (!date || !start) return { room: null, instructor: null };
    return {
      room: suggestBestRoomId({
        config,
        meetings,
        date,
        dates: [date],
        start,
        end: end || undefined,
        audienceTokens: audience,
        index,
      }),
      instructor: suggestBestInstructorId({
        config,
        meetings,
        date,
        dates: [date],
        start,
        end: end || undefined,
        weekday,
        courseInstructors: course.instructors,
        instructorPool: component.instructor_pool,
        index,
      }),
    };
  }

  const slot = seedWeeklyFromCell(config, cell, groupIds);
  const start = String(slot.start_time || "").slice(0, 5);
  const end = String(slot.end_time || "").slice(0, 5);
  const dates = roomPickerDatesForEdit({ config, weekday });
  const focusDate = cell.date || dates[0] || "";
  if (!focusDate || !start) return { room: null, instructor: null };

  return {
    room: suggestBestRoomId({
      config,
      meetings,
      date: focusDate,
      dates: dates.length ? dates : [focusDate],
      start,
      end: end || undefined,
      audienceTokens: audience,
      index,
    }),
    instructor: suggestBestInstructorId({
      config,
      meetings,
      date: focusDate,
      dates: instructorPickerDatesForWeekday(config, weekday),
      start,
      end: end || undefined,
      weekday,
      courseInstructors: course.instructors,
      instructorPool: component.instructor_pool,
      index,
    }),
  };
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
    buildAudienceSelectorTree(config, {
      sectionCode: course.section_code,
    }),
  );
  if (!audience.length) return null;

  const series = findOrCreateSessionSeries(
    nextComponent,
    audience,
    config,
    course.section_code,
  );

  if (draft.placement === "occurrences") {
    const items = (draft.occurrences ?? []).filter((occurrence) =>
      String(occurrence.date || "").trim(),
    );
    if (!items.length) return null;
    series.occurrences = items.map((occurrence) => ({
      date: occurrence.date,
      start_time: normalizeTimeToApi(occurrence.start_time),
      end_time: normalizeTimeToApi(
        occurrence.end_time ||
          resolveEndTimeForStart(config, occurrence.start_time, audience),
      ),
      room: String(occurrence.room || "").trim() || null,
      instructor: occurrence.instructor ?? null,
    }));
    return nextCourse;
  }

  const slots = draft.weeklySlots ?? [];
  if (!slots.length) return null;
  series.weekly_pattern = slots.map((slot) => ({
    weekday: slot.weekday,
    start_time: normalizeTimeToApi(slot.start_time),
    end_time: normalizeTimeToApi(
      slot.end_time ||
        resolveEndTimeForStart(config, slot.start_time, audience),
    ),
    room: String(slot.room || "").trim() || null,
    instructor: slot.instructor ?? null,
    edits: slot.edits ?? null,
  }));
  return nextCourse;
}
