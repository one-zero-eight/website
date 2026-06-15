import type {
  SchemaInstructor,
  SchemaIssue,
  SchemaScheduledMeeting,
} from "@/api/schedule-assistant/types.ts";
import type { Meeting } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import {
  dayKey,
  todayIsoDate,
  weekdayLabelRu,
  weeklyPatternDayKey,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";

function instructorKey(value: string | string[] | null | undefined) {
  const list = typeof value === "string" ? [value] : value || [];
  return list
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join("\0");
}

function timeKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .slice(0, 5);
}

function dateOnly(value: string | null | undefined) {
  return String(value || "").slice(0, 10);
}

function groupsKey(groups: string[]) {
  return [...groups].sort().join("|");
}

export function extractMeetingsFromIssue(
  issue: SchemaIssue,
): SchemaScheduledMeeting[] {
  switch (issue.issue_type) {
    case "capacity":
    case "unbooked":
    case "instructor_banned_slot":
    case "instructor_preference":
      return [issue.meeting];
    case "room":
    case "group":
    case "student":
    case "outlook":
      return issue.meetings;
    case "teacher":
      return [...issue.teaching_meetings, ...issue.studying_meetings];
    default:
      return [];
  }
}

export function scheduledMeetingMatches(
  meeting: Meeting,
  scheduled: SchemaScheduledMeeting,
): boolean {
  if (meeting.course !== scheduled.course_name) return false;
  if (meeting.tag !== scheduled.component_tag) return false;
  if (timeKey(meeting.start) !== timeKey(scheduled.start_time)) return false;
  if (String(meeting.room || "").trim() !== String(scheduled.room ?? "").trim())
    return false;
  if (
    instructorKey(meeting.instructors) !== instructorKey(scheduled.instructor)
  )
    return false;
  if (groupsKey(meeting.groups) !== groupsKey(scheduled.groups)) return false;

  if (scheduled.placement.kind === "occurrence") {
    return dateOnly(meeting.date) === dateOnly(scheduled.placement.date);
  }

  const weekdayKey = weeklyPatternDayKey(String(scheduled.placement.weekday));
  if (!weekdayKey) return false;
  return dayKey(meeting.date) === weekdayKey;
}

export function resolveMeetingInstanceId(
  scheduled: SchemaScheduledMeeting,
  allMeetings: Meeting[],
): string | null {
  const matches = allMeetings.filter(
    (meeting) =>
      !meeting.cancelled && scheduledMeetingMatches(meeting, scheduled),
  );
  if (!matches.length) return null;

  const today = todayIsoDate();
  const sorted = [...matches].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const upcoming = sorted.find((meeting) => meeting.date >= today);
  return (upcoming ?? sorted[0]).instance_id;
}

export function formatRuDate(dateStr: string) {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatScheduledMeetingWhen(scheduled: SchemaScheduledMeeting) {
  const start = timeKey(scheduled.start_time);
  const end = timeKey(scheduled.end_time);
  const timeRange = `${start}–${end}`;
  const roomSuffix = scheduled.room ? ` (${scheduled.room})` : "";

  if (scheduled.placement.kind === "occurrence") {
    const weekday = weekdayLabelRu(dayKey(scheduled.placement.date));
    return `${weekday} ${formatRuDate(scheduled.placement.date)} ${timeRange}${roomSuffix}`;
  }

  const weekday = weekdayLabelRu(
    weeklyPatternDayKey(String(scheduled.placement.weekday)) ?? "",
  );
  const weekdayLower = weekday.charAt(0).toLowerCase() + weekday.slice(1);
  return `Каждый ${weekdayLower} ${timeRange}${roomSuffix}`;
}

export function formatInstructorLabel(
  instructor: string | string[] | null | undefined,
  instructorsById: Map<string, SchemaInstructor>,
) {
  const ids = typeof instructor === "string" ? [instructor] : instructor || [];
  const labels = ids
    .map((id) => {
      const entry = instructorsById.get(id);
      return (
        entry?.name_ru?.trim() ||
        entry?.name_en?.trim() ||
        entry?.alias?.trim() ||
        id
      );
    })
    .filter(Boolean);
  return labels.join(", ") || "—";
}

export function buildInstructorsById(
  instructors: SchemaInstructor[] | undefined,
) {
  const map = new Map<string, SchemaInstructor>();
  for (const instructor of instructors ?? []) {
    map.set(instructor.id, instructor);
  }
  return map;
}
