import type {
  SchemaIssue,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { sortIssuesByTypeOrder } from "@/components/schedule-assistant/checks/checksModel.ts";
import { extractMeetingsFromIssue } from "@/components/schedule-assistant/checks/issueMeetings.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { buildGroupToProgramMap } from "@/components/schedule-assistant/timetable/programTimeSlots.ts";

export const NO_PROGRAM_GROUP_KEY = "__no_program__";
export const NO_PROGRAM_GROUP_TITLE = "Без программы";

export type IssueProgramGroup = {
  key: string;
  title: string;
  issues: SchemaIssue[];
};

export function collectIssueGroupCodes(issue: SchemaIssue): string[] {
  const codes = new Set<string>();

  for (const meeting of extractMeetingsFromIssue(issue)) {
    for (const group of meeting.groups ?? []) {
      const code = String(group || "").trim();
      if (code) codes.add(code);
    }
  }

  switch (issue.issue_type) {
    case "group": {
      const code = String(issue.group || "").trim();
      if (code) codes.add(code);
      break;
    }
    case "unplaced":
    case "per_week": {
      for (const group of issue.student_groups ?? []) {
        const code = String(group || "").trim();
        if (code) codes.add(code);
      }
      break;
    }
    case "student_email": {
      for (const group of issue.groups ?? []) {
        const code = String(group || "").trim();
        if (code) codes.add(code);
      }
      break;
    }
    default:
      break;
  }

  return [...codes];
}

export function groupIssuesByProgram(
  issues: SchemaIssue[],
  config: SchemaScheduleConfig | null | undefined,
): IssueProgramGroup[] {
  const groupToProgram = buildGroupToProgramMap(config);
  const buckets = new Map<string, SchemaIssue[]>();
  const titles = new Map<string, string>();

  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const key = String(program.code || "").trim();
      if (!key || titles.has(key)) continue;
      titles.set(
        key,
        String(program.name || program.code || key).trim() || key,
      );
    }
  }
  titles.set(NO_PROGRAM_GROUP_KEY, NO_PROGRAM_GROUP_TITLE);

  for (const issue of issues) {
    const programs = new Set<string>();
    for (const groupCode of collectIssueGroupCodes(issue)) {
      const program = groupToProgram.get(groupCode);
      const key = String(program?.code || "").trim();
      if (key) programs.add(key);
    }

    if (!programs.size) {
      programs.add(NO_PROGRAM_GROUP_KEY);
    }

    for (const key of programs) {
      const existing = buckets.get(key);
      if (existing) {
        existing.push(issue);
        continue;
      }
      buckets.set(key, [issue]);
    }
  }

  const orderedKeys: string[] = [];
  for (const section of getScheduleSections(config)) {
    for (const program of section.programs || []) {
      const key = String(program.code || "").trim();
      if (!key || !buckets.has(key) || orderedKeys.includes(key)) continue;
      orderedKeys.push(key);
    }
  }
  if (buckets.has(NO_PROGRAM_GROUP_KEY)) {
    orderedKeys.push(NO_PROGRAM_GROUP_KEY);
  }

  return orderedKeys.map((key) => ({
    key,
    title: titles.get(key) || key,
    issues: sortIssuesByTypeOrder(buckets.get(key) ?? []),
  }));
}
