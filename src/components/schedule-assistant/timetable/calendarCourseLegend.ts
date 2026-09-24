import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { normalizeTracksFromSectionProgram } from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";

import {
  resolveInstructorLabel,
  type Meeting,
} from "./timetableViewerModel.ts";

export type CalendarCourseLegendRow = {
  shortName: string;
  courseName: string;
  instructor: string;
};

function courseAudienceTokens(
  course: NonNullable<SchemaScheduleConfig["courses"]>[number],
): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const component of course.components ?? []) {
    for (const token of component.audience ?? []) {
      const trimmed = String(token || "").trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      tokens.push(trimmed);
    }
    for (const series of component.sessions ?? []) {
      for (const token of series.audience ?? []) {
        const trimmed = String(token || "").trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        tokens.push(trimmed);
      }
    }
  }
  return tokens;
}

function programGroupSet(
  config: SchemaScheduleConfig,
  sectionCode: string,
  programCode: string | null | undefined,
): Set<string> | null {
  const section = getScheduleSections(config).find(
    (item) => item.code === sectionCode,
  );
  if (!section) return null;
  const programs = section.programs ?? [];
  const selected =
    programCode != null
      ? programs.find((program) => program.code === programCode)
      : null;
  const targetPrograms = selected ? [selected] : programs;
  const groups = new Set<string>();
  for (const program of targetPrograms) {
    for (const track of normalizeTracksFromSectionProgram(program)) {
      for (const group of track.groups ?? []) {
        const trimmed = String(group || "").trim();
        if (trimmed) groups.add(trimmed);
      }
    }
  }
  return groups;
}

function instructorIds(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const single = String(value || "").trim();
  return single ? [single] : [];
}

export function buildCalendarCourseLegend({
  config,
  meetings,
  sectionCode,
  programCode,
  instructorLabelById,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  sectionCode: string;
  programCode?: string | null;
  instructorLabelById: Record<string, string>;
}): CalendarCourseLegendRow[] {
  const groups = programGroupSet(config, sectionCode, programCode);
  if (!groups?.size) return [];

  const instructorsByCourse = new Map<string, Set<string>>();

  for (const meeting of meetings) {
    if (meeting.cancelled) continue;
    if ((meeting.section || "").trim() !== sectionCode) continue;
    if (!meeting.groups.some((group) => groups.has(group))) continue;
    const courseName = String(meeting.course || "").trim();
    if (!courseName) continue;
    let instructors = instructorsByCourse.get(courseName);
    if (!instructors) {
      instructors = new Set();
      instructorsByCourse.set(courseName, instructors);
    }
    for (const id of instructorIds(meeting.instructors)) {
      instructors.add(resolveInstructorLabel(id, instructorLabelById));
    }
  }

  const rows: CalendarCourseLegendRow[] = [];
  for (const course of config.courses ?? []) {
    if ((course.section_code || "").trim() !== sectionCode) continue;
    const tokens = courseAudienceTokens(course);
    const expanded = expandStudentGroupSelectors(config, tokens);
    if (!expanded.some((group) => groups.has(group))) continue;

    const courseName = String(course.name || "").trim();
    if (!courseName) continue;

    const courseInstructorLabels = (course.instructors ?? [])
      .map((item) => resolveInstructorLabel(item.id, instructorLabelById))
      .filter(Boolean);
    const meetingInstructorLabels = [
      ...(instructorsByCourse.get(courseName) ?? []),
    ];
    const instructor = (
      courseInstructorLabels.length
        ? courseInstructorLabels
        : meetingInstructorLabels
    ).join(", ");

    rows.push({
      shortName: String(course.short_name || "").trim() || courseName,
      courseName,
      instructor: instructor || "—",
    });
  }

  return rows.sort((a, b) =>
    a.shortName.localeCompare(b.shortName, "en", { sensitivity: "base" }),
  );
}
