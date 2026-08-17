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
    .sort((left, right) => left.localeCompare(right))
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

function roomsCompatible(
  meetingRoom: string | null | undefined,
  scheduledRoom: string | null | undefined,
) {
  const meeting = String(meetingRoom || "").trim();
  const scheduled = String(scheduledRoom ?? "").trim();
  if (!scheduled || !meeting) return true;
  return meeting === scheduled;
}

function instructorsCompatible(
  meetingInstructors: string | string[] | null | undefined,
  scheduledInstructor: string | string[] | null | undefined,
) {
  const scheduled = instructorKey(scheduledInstructor);
  if (!scheduled) return true;
  return instructorKey(meetingInstructors) === scheduled;
}

function groupsCompatible(meetingGroups: string[], scheduledGroups: string[]) {
  if (!scheduledGroups.length || !meetingGroups.length) return true;
  if (groupsKey(meetingGroups) === groupsKey(scheduledGroups)) return true;
  const meetingSet = new Set(
    meetingGroups.map((group) => group.trim()).filter(Boolean),
  );
  return scheduledGroups.some((group) => meetingSet.has(group.trim()));
}

function courseMatches(meeting: Meeting, scheduled: SchemaScheduledMeeting) {
  const name = String(scheduled.course_name || "").trim();
  if (!name) return false;
  if (String(meeting.course || "").trim() === name) return true;
  return String(meeting.course_short_name || "").trim() === name;
}

function placementMatches(meeting: Meeting, scheduled: SchemaScheduledMeeting) {
  if (scheduled.placement.kind === "occurrence") {
    return dateOnly(meeting.date) === dateOnly(scheduled.placement.date);
  }
  const weekdayKey = weeklyPatternDayKey(String(scheduled.placement.weekday));
  if (!weekdayKey) return false;
  return dayKey(meeting.date) === weekdayKey;
}

export function extractMeetingsFromIssue(
  issue: SchemaIssue,
): SchemaScheduledMeeting[] {
  switch (issue.issue_type) {
    case "capacity":
    case "unbooked":
    case "missing_room":
    case "missing_instructor":
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
  if (!courseMatches(meeting, scheduled)) return false;
  if (meeting.tag !== scheduled.component_tag) return false;
  if (timeKey(meeting.start) !== timeKey(scheduled.start_time)) return false;
  if (!roomsCompatible(meeting.room, scheduled.room)) return false;
  if (!instructorsCompatible(meeting.instructors, scheduled.instructor)) {
    return false;
  }
  if (!groupsCompatible(meeting.groups, scheduled.groups ?? [])) return false;
  return placementMatches(meeting, scheduled);
}

function scheduledMeetingMatchesLoose(
  meeting: Meeting,
  scheduled: SchemaScheduledMeeting,
): boolean {
  if (!courseMatches(meeting, scheduled)) return false;
  if (meeting.tag !== scheduled.component_tag) return false;
  if (timeKey(meeting.start) !== timeKey(scheduled.start_time)) return false;
  return placementMatches(meeting, scheduled);
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

function collectIndexedMeetings(index: MeetingInstanceIndex): Meeting[] {
  const meetings: Meeting[] = [];
  for (const bucket of index.values()) meetings.push(...bucket);
  return meetings;
}

export function resolveMeetingInstanceId(
  scheduled: SchemaScheduledMeeting,
  allMeetings: Meeting[] | MeetingInstanceIndex,
): string | null {
  const pool = Array.isArray(allMeetings)
    ? allMeetings
    : collectIndexedMeetings(allMeetings);

  const exact = pickInstanceId(
    pool.filter(
      (meeting) =>
        !meeting.cancelled && scheduledMeetingMatches(meeting, scheduled),
    ),
  );
  if (exact) return exact;

  return pickInstanceId(
    pool.filter(
      (meeting) =>
        !meeting.cancelled && scheduledMeetingMatchesLoose(meeting, scheduled),
    ),
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
