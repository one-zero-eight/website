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
} from "./meetingEditUtils.ts";
import type { TimetableLayoutMode } from "./TimetableLayoutSelector.tsx";
import type { WeekRange } from "./timetableViewerModel.ts";
import { weekStartForDate } from "./timetableViewerModel.ts";

export type CreateMeetingCellContext = {
  weekday: TermWeekdayKey;
  time: string;
  date: string;
  groupId?: string;
};

export type CreateMeetingViewContext = {
  sectionCode?: string;
  groupId?: string;
  visibleGroupIds?: string[];
  /** From buildCoursesToSections(config); keys are course indices as strings. */
  coursesToSections?: Record<string, string[]>;
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
  inCurrentView: boolean;
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
) {
  const tree = buildAudienceSelectorTree(config);
  const explicit = series.audience || [];
  if (explicit.length) return minimizeAudienceTokens(explicit, tree);
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

function expandedAudience(
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
) {
  return expandedAudience(
    config,
    audienceForSeries(component, series, config),
  ).includes(groupId);
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

export function defaultAudienceForCreate(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  cellGroupId?: string,
): string[] {
  const tree = buildAudienceSelectorTree(config);
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
): SchemaComponentSessionSeries | null {
  const tree = buildAudienceSelectorTree(config);
  const targetAudience = minimizeAudienceTokens(audience, tree);
  if (!targetAudience.length) return null;

  const sessions = component.sessions || [];
  if (!sessions.length) return null;

  for (const series of sessions) {
    if (
      audienceTokensEquivalent(
        config,
        audienceForSeries(component, series, config),
        targetAudience,
      )
    ) {
      return series;
    }
  }

  const targetExpanded = expandedAudience(config, targetAudience);

  if (component.per_group && targetExpanded.length === 1) {
    const groupId = targetExpanded[0]!;
    let multiHit: SchemaComponentSessionSeries | null = null;
    for (const series of sessions) {
      const expanded = expandedAudience(
        config,
        audienceForSeries(component, series, config),
      );
      if (expanded.length === 1 && expanded[0] === groupId) return series;
      if (expanded.includes(groupId) && !multiHit) multiHit = series;
    }
    if (multiHit) return multiHit;
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
          audienceForSeries(component, series, config),
          componentTokens,
        )
      ) {
        return series;
      }
    }
  }

  return null;
}

function seriesAudienceForCreate(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
): string[] {
  const tree = buildAudienceSelectorTree(config);
  if (component.per_group) {
    return minimizeAudienceTokens(audience, tree);
  }
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

function findOrCreateSessionSeries(
  component: SchemaComponent,
  audience: string[],
  config: SchemaScheduleConfig,
): SchemaComponentSessionSeries {
  const matched = findMatchingSessionSeries(component, audience, config);
  if (matched) return matched;

  if (!component.sessions) component.sessions = [];
  const created: SchemaComponentSessionSeries = {
    audience: seriesAudienceForCreate(component, audience, config),
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
): CreateSeriesAction {
  return findMatchingSessionSeries(component, audience, config)
    ? "append"
    : "create";
}

export function componentScheduleStatus(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  focusGroupId?: string,
): ComponentScheduleStatus {
  const sessions = component.sessions || [];
  const relevant =
    component.per_group && focusGroupId
      ? sessions.filter((series) =>
          seriesCoversGroup(component, series, config, focusGroupId),
        )
      : sessions;

  if (!relevant.some(seriesHasPlacement)) return "empty";

  const perWeek = component.per_week;
  if (perWeek != null && perWeek > 0) {
    const weekly = weeklySlotCount(relevant);
    if (weekly >= perWeek) return "covered";
    return "partial";
  }

  return "covered";
}

export function componentScheduleStatusLabel(
  status: ComponentScheduleStatus,
): string {
  if (status === "empty") return "нет";
  if (status === "partial") return "частично";
  return "есть";
}

function componentTouchesView(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  view: CreateMeetingViewContext | undefined,
  courseIdx: number,
): boolean {
  if (!view) return false;

  const sectionCodes = view.coursesToSections?.[String(courseIdx)] ?? [];
  if (
    view.sectionCode &&
    sectionCodes.some((code) => code === view.sectionCode)
  ) {
    return true;
  }

  const focusIds = [
    ...(view.groupId ? [view.groupId] : []),
    ...(view.visibleGroupIds ?? []),
  ];
  if (!focusIds.length) return Boolean(view.sectionCode && sectionCodes.length);

  const focusSet = new Set(focusIds);
  const tokens = [
    ...(component.student_groups || []),
    ...(component.sessions || []).flatMap((series) => series.audience || []),
  ];
  return expandedAudience(config, tokens).some((groupId) =>
    focusSet.has(groupId),
  );
}

export function courseComponentOptions(
  courses: SchemaCourseConfig[],
  config?: SchemaScheduleConfig,
  view?: CreateMeetingViewContext,
): CourseComponentCreateOption[] {
  const options: CourseComponentCreateOption[] = [];
  const focusGroupId = view?.groupId;

  for (const [courseIdx, course] of courses.entries()) {
    const title = String(course.short_name || course.name || "").trim() || "—";
    for (const [componentIdx, component] of (
      course.components || []
    ).entries()) {
      const tag = String(component.tag || "").trim() || "—";
      const perGroup = Boolean(component.per_group);
      const status = config
        ? componentScheduleStatus(component, config, focusGroupId)
        : "empty";
      const audience = config
        ? defaultAudienceForCreate(component, config, focusGroupId)
        : [];
      const seriesAction =
        config && audience.length
          ? previewCreateSeriesAction(component, audience, config)
          : "create";
      const statusLabel = componentScheduleStatusLabel(status);
      const modeLabel = perGroup ? "по группам" : "";
      const inCurrentView = config
        ? componentTouchesView(component, config, view, courseIdx)
        : false;

      options.push({
        value: `${courseIdx}:${componentIdx}`,
        label: `${title} (${tag})`,
        courseIdx,
        componentIdx,
        perGroup,
        inCurrentView,
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
    if (a.inCurrentView !== b.inCurrentView) {
      return a.inCurrentView ? -1 : 1;
    }
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

export function resolveSectionKind(
  tokens: string[],
  config: SchemaScheduleConfig,
): string | null {
  const tokenToKind = new Map<string, string>();
  for (const section of config.term?.sections ?? []) {
    const kind = String(section.kind || section.code || "")
      .trim()
      .toLowerCase();
    if (!kind) continue;
    for (const program of section.programs ?? []) {
      const programCode = String(program.code || "").trim();
      if (programCode) tokenToKind.set(`@${programCode}`, kind);
      for (const group of program.groups ?? []) {
        tokenToKind.set(String(group), kind);
      }
      for (const track of program.tracks ?? []) {
        if (programCode) {
          tokenToKind.set(`@${programCode}/${track.name}`, kind);
          tokenToKind.set(`@${programCode}/${track.code}`, kind);
        }
        for (const group of track.groups ?? []) {
          tokenToKind.set(String(group), kind);
        }
      }
    }
  }
  for (const group of config.students_groups ?? []) {
    const code = String(group.code || "").trim();
    const kind = String(group.kind || "")
      .trim()
      .toLowerCase();
    if (code && kind && !tokenToKind.has(code)) tokenToKind.set(code, kind);
  }

  for (const token of tokens) {
    const raw = String(token || "").trim();
    if (!raw) continue;
    const kind = tokenToKind.get(raw);
    if (kind) return kind;
    if (raw.startsWith("@") && raw.includes("/")) {
      const programKind = tokenToKind.get(raw.split("/", 1)[0] ?? "");
      if (programKind) return programKind;
    }
  }
  return null;
}

/** Non-core audiences (electives, english, …) prefer date occurrences in settings. */
export function audiencePrefersOccurrences(
  tokens: string[],
  config: SchemaScheduleConfig,
): boolean {
  const kind = resolveSectionKind(tokens.map(String), config);
  return kind != null && kind !== "core" && kind !== "core_course";
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

  const matched = findMatchingSessionSeries(component, audience, config);
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

  if (draft.placement === "occurrences") {
    const items = (draft.occurrences ?? []).filter((occurrence) =>
      String(occurrence.date || "").trim(),
    );
    if (!items.length) return null;
    if (!series.occurrences) series.occurrences = [];
    for (const occurrence of items) {
      series.occurrences.push({
        date: occurrence.date,
        start_time: normalizeTimeToApi(occurrence.start_time),
        end_time: normalizeTimeToApi(
          occurrence.end_time ||
            resolveEndTimeForStart(config, occurrence.start_time, audience),
        ),
        room: String(occurrence.room || "").trim() || null,
        instructor: occurrence.instructor ?? null,
      });
    }
    return nextCourse;
  }

  const slots = draft.weeklySlots ?? [];
  if (!slots.length) return null;
  if (!series.weekly_pattern) series.weekly_pattern = [];
  for (const slot of slots) {
    series.weekly_pattern.push({
      weekday: slot.weekday,
      start_time: normalizeTimeToApi(slot.start_time),
      end_time: normalizeTimeToApi(
        slot.end_time ||
          resolveEndTimeForStart(config, slot.start_time, audience),
      ),
      room: String(slot.room || "").trim() || null,
      instructor: slot.instructor ?? null,
      edits: slot.edits ?? null,
    });
  }
  return nextCourse;
}
