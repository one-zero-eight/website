import type {
  SchemaComponent,
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  componentProgressHint,
  componentScheduleStatus,
  componentScheduleStatusLabel,
  expandedAudience,
  type ComponentScheduleStatus,
  type CreateMeetingViewContext,
} from "./createMeetingUtils.ts";
import { formatAudienceTokensLabel } from "./meetingEditUtils.ts";
import { formatInstructorPoolEntries } from "./meetingComponentContext.ts";
import { resolveInstructorLabel } from "./timetableViewerModel.ts";

/** One placeable session series (audience bucket) within a component. */
export type UnarrangedLessonItem = {
  key: string;
  courseIdx: number;
  componentIdx: number;
  courseName: string;
  shortName: string;
  tag: string;
  /** Component title: «Course (tag)». */
  componentLabel: string;
  /** Session row / placement ghost title. */
  label: string;
  perGroup: boolean;
  audience: string[];
  groupIds: string[];
  status: ComponentScheduleStatus;
  statusLabel: string;
  progressHint: string;
  audienceLabel: string;
  searchText: string;
};

export type UnarrangedComponentGroup = {
  key: string;
  courseIdx: number;
  componentIdx: number;
  label: string;
  shortName: string;
  tag: string;
  perGroup: boolean;
  modeLabel: string;
  instructorLabel: string;
  componentStatus: ComponentScheduleStatus;
  componentStatusLabel: string;
  sessions: UnarrangedLessonItem[];
  searchText: string;
};

const STATUS_RANK: Record<ComponentScheduleStatus, number> = {
  empty: 0,
  partial: 1,
  covered: 2,
};

function courseTitle(course: SchemaCourseConfig) {
  return String(course.short_name || course.name || "").trim() || "—";
}

function componentLabel(
  course: SchemaCourseConfig,
  component: SchemaComponent,
) {
  const shortName = courseTitle(course);
  const tag = String(component.tag || "").trim() || "—";
  return `${shortName} (${tag})`;
}

function buildSessionItem(params: {
  course: SchemaCourseConfig;
  courseIdx: number;
  component: SchemaComponent;
  componentIdx: number;
  audience: string[];
  groupIds: string[];
  status: ComponentScheduleStatus;
  config: SchemaScheduleConfig;
}): UnarrangedLessonItem | null {
  if (params.status === "covered") return null;
  if (!params.audience.length) return null;

  const shortName = courseTitle(params.course);
  const tag = String(params.component.tag || "").trim() || "—";
  const label = `${shortName} (${tag})`;
  const audienceLabel = formatAudienceTokensLabel(
    params.config,
    params.audience,
  );
  const focusGroupId =
    params.component.per_group && params.groupIds.length === 1
      ? params.groupIds[0]
      : undefined;
  const progressHint = componentProgressHint(
    params.component,
    params.config,
    params.course.section_code,
    focusGroupId,
  );
  const key = `${params.courseIdx}:${params.componentIdx}:${params.audience.join("|")}`;
  const sessionLabel = audienceLabel ? `${label} · ${audienceLabel}` : label;

  return {
    key,
    courseIdx: params.courseIdx,
    componentIdx: params.componentIdx,
    courseName: String(params.course.name || "").trim(),
    shortName,
    tag,
    componentLabel: label,
    label: sessionLabel,
    perGroup: Boolean(params.component.per_group),
    audience: params.audience,
    groupIds: params.groupIds,
    status: params.status,
    statusLabel: componentScheduleStatusLabel(params.status),
    progressHint,
    audienceLabel,
    searchText: [
      shortName,
      tag,
      params.course.name,
      audienceLabel,
      progressHint,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function sessionBucketsForComponent(
  course: SchemaCourseConfig,
  courseIdx: number,
  component: SchemaComponent,
  componentIdx: number,
  config: SchemaScheduleConfig,
  focusGroupId?: string,
): UnarrangedLessonItem[] {
  const sectionCode = course.section_code;
  const tree = buildAudienceSelectorTree(config, { sectionCode });
  const pool = expandedAudience(config, component.student_groups || []);
  const sessions: UnarrangedLessonItem[] = [];

  if (component.per_group) {
    for (const groupId of pool) {
      const status = componentScheduleStatus(
        component,
        config,
        sectionCode,
        groupId,
      );
      const item = buildSessionItem({
        course,
        courseIdx,
        component,
        componentIdx,
        audience: minimizeAudienceTokens([groupId], tree),
        groupIds: [groupId],
        status,
        config,
      });
      if (item) sessions.push(item);
    }
    return sessions;
  }

  const status = componentScheduleStatus(
    component,
    config,
    sectionCode,
    focusGroupId,
  );
  const item = buildSessionItem({
    course,
    courseIdx,
    component,
    componentIdx,
    audience: minimizeAudienceTokens(component.student_groups || [], tree),
    groupIds: pool,
    status,
    config,
  });
  if (item) sessions.push(item);
  return sessions;
}

export function buildUnarrangedComponentGroups(
  courses: SchemaCourseConfig[],
  config: SchemaScheduleConfig,
  view?: CreateMeetingViewContext,
  instructorLabelById: Record<string, string> = {},
): UnarrangedComponentGroup[] {
  const groups: UnarrangedComponentGroup[] = [];
  const focusGroupId = view?.groupId;

  for (const [courseIdx, course] of courses.entries()) {
    if (view?.sectionCode && course.section_code !== view.sectionCode) {
      continue;
    }

    for (const [componentIdx, component] of (
      course.components || []
    ).entries()) {
      const sessions = sessionBucketsForComponent(
        course,
        courseIdx,
        component,
        componentIdx,
        config,
        focusGroupId,
      ).sort((a, b) => {
        if (a.status !== b.status) {
          return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        }
        return a.audienceLabel.localeCompare(b.audienceLabel, "ru");
      });
      const componentStatus = componentScheduleStatus(
        component,
        config,
        course.section_code,
        focusGroupId,
      );
      if (componentStatus === "covered" && !sessions.length) continue;

      const label = componentLabel(course, component);
      const shortName = courseTitle(course);
      const tag = String(component.tag || "").trim() || "—";
      const perGroup = Boolean(component.per_group);
      const modeLabel = perGroup ? "по группам" : "";
      const instructorLabel = formatInstructorPoolEntries(
        component.instructor_pool ?? [],
        (id) => resolveInstructorLabel(id, instructorLabelById),
      ).join(", ");

      groups.push({
        key: `${courseIdx}:${componentIdx}`,
        courseIdx,
        componentIdx,
        label,
        shortName,
        tag,
        perGroup,
        modeLabel,
        instructorLabel,
        componentStatus,
        componentStatusLabel: componentScheduleStatusLabel(componentStatus),
        sessions,
        searchText: [
          shortName,
          tag,
          course.name,
          modeLabel,
          instructorLabel,
          label,
        ]
          .filter(Boolean)
          .join(" "),
      });
    }
  }

  return groups.sort((a, b) => {
    if (a.componentStatus !== b.componentStatus) {
      return STATUS_RANK[a.componentStatus] - STATUS_RANK[b.componentStatus];
    }
    return a.label.localeCompare(b.label, "ru");
  });
}

export function flattenUnarrangedGroups(
  groups: UnarrangedComponentGroup[],
): UnarrangedLessonItem[] {
  return groups.flatMap((group) => group.sessions);
}

/** @deprecated Use buildUnarrangedComponentGroups + flattenUnarrangedGroups. */
export function buildUnarrangedLessons(
  courses: SchemaCourseConfig[],
  config: SchemaScheduleConfig,
  view?: CreateMeetingViewContext,
): UnarrangedLessonItem[] {
  return flattenUnarrangedGroups(
    buildUnarrangedComponentGroups(courses, config, view),
  );
}

export function findUnarrangedLesson(
  items: UnarrangedLessonItem[],
  key: string | null | undefined,
): UnarrangedLessonItem | null {
  if (!key) return null;
  return items.find((item) => item.key === key) ?? null;
}

export function countUnarrangedSessions(groups: UnarrangedComponentGroup[]) {
  return groups.reduce((sum, group) => {
    if (!group.sessions.length) return sum + 1;
    return sum + group.sessions.length;
  }, 0);
}
