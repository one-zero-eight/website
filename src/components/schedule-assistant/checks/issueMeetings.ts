import type {
  SchemaInstructor,
  SchemaIssue,
  SchemaScheduledMeeting,
} from "@/api/schedule-assistant/types.ts";
import type { Meeting } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import {
  dayKey,
  everyWeekdayPhraseRu,
  formatDisplayDate,
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
  return [...groups].sort((a, b) => a.localeCompare(b)).join("|");
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

function meetingIdentityKey(parts: {
  course: string;
  tag: string;
  start: string | null | undefined;
  room: string | null | undefined;
  instructor: string | string[] | null | undefined;
  groups: string[];
}) {
  return [
    parts.course,
    parts.tag,
    timeKey(parts.start),
    String(parts.room || "").trim(),
    instructorKey(parts.instructor),
    groupsKey(parts.groups),
  ].join("\0");
}

export type MeetingInstanceIndex = Map<string, Meeting[]>;

export function buildMeetingInstanceIndex(
  allMeetings: Meeting[],
): MeetingInstanceIndex {
  const index: MeetingInstanceIndex = new Map();
  for (const meeting of allMeetings) {
    if (meeting.cancelled) continue;
    const key = meetingIdentityKey({
      course: meeting.course,
      tag: meeting.tag,
      start: meeting.start,
      room: meeting.room,
      instructor: meeting.instructors,
      groups: meeting.groups,
    });
    const bucket = index.get(key);
    if (bucket) bucket.push(meeting);
    else index.set(key, [meeting]);
  }
  return index;
}

function pickInstanceId(matches: Meeting[]): string | null {
  if (!matches.length) return null;
  const today = todayIsoDate();
  const sorted = [...matches].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const upcoming = sorted.find((meeting) => meeting.date >= today);
  return (upcoming ?? sorted[0]).instance_id;
}

export function resolveMeetingInstanceId(
  scheduled: SchemaScheduledMeeting,
  allMeetings: Meeting[] | MeetingInstanceIndex,
): string | null {
  if (Array.isArray(allMeetings)) {
    return pickInstanceId(
      allMeetings.filter(
        (meeting) =>
          !meeting.cancelled && scheduledMeetingMatches(meeting, scheduled),
      ),
    );
  }

  const key = meetingIdentityKey({
    course: scheduled.course_name,
    tag: scheduled.component_tag,
    start: scheduled.start_time,
    room: scheduled.room,
    instructor: scheduled.instructor,
    groups: scheduled.groups,
  });
  const candidates = allMeetings.get(key) ?? [];
  if (scheduled.placement.kind === "occurrence") {
    const date = dateOnly(scheduled.placement.date);
    return pickInstanceId(
      candidates.filter((meeting) => dateOnly(meeting.date) === date),
    );
  }

  const weekdayKey = weeklyPatternDayKey(String(scheduled.placement.weekday));
  if (!weekdayKey) return null;
  return pickInstanceId(
    candidates.filter((meeting) => dayKey(meeting.date) === weekdayKey),
  );
}

export function formatRuDate(dateStr: string) {
  return formatDisplayDate(dateStr);
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

  const weekdayKey =
    weeklyPatternDayKey(String(scheduled.placement.weekday)) ?? "";
  return `${everyWeekdayPhraseRu(weekdayKey)} ${timeRange}${roomSuffix}`;
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
