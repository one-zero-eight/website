import { createElement } from "react";

import {
  InstructorSlotPreferenceLevel,
  Weekday,
  type SchemaCourseConfig,
  type SchemaInstructor,
  type SchemaInstructorSlotPreferenceEntry,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import type { SelectDropdownOption } from "@/components/common/SelectDropdown.tsx";
import {
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  resolveEndTimeForStart,
  parseMeetingInstanceId,
  type MeetingRef,
} from "./meetingEditUtils.ts";
import { InstructorAvailabilityStatusMark } from "./InstructorAvailabilityStatusMark.tsx";
import {
  isSameLogicalMeeting,
  timesOverlap,
  type RoomAvailabilityStatus,
  type RoomConflictDetail,
  type RoomConflictMeeting,
} from "./roomPickerOptions.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import { add90m, semesterDatesForWeekday } from "./timetableViewerModel.ts";

type CourseInstructor = NonNullable<SchemaCourseConfig["instructors"]>[number];

export type InstructorAvailabilityStatus = RoomAvailabilityStatus;

export type InstructorConflictDetail = RoomConflictDetail;

export type InstructorPreferenceIssue = {
  level: InstructorSlotPreferenceLevel;
};

export type InstructorAvailabilityInfo = {
  status: InstructorAvailabilityStatus;
  conflicts: InstructorConflictDetail[];
  preference: InstructorPreferenceIssue | null;
};

function meetingHasInstructor(meeting: Meeting, instructorId: string): boolean {
  const id = instructorId.trim();
  if (!id) return false;
  const raw = meeting.instructors;
  if (typeof raw === "string") return raw.trim() === id;
  if (Array.isArray(raw)) {
    return raw.some((item) => String(item || "").trim() === id);
  }
  return false;
}

export function countInstructorDailyLoad(
  meetings: Meeting[],
  instructorId: string,
  date: string,
  excludeInstanceId?: string | null,
): number {
  const id = instructorId.trim();
  const day = date.trim();
  if (!id || !day) return 0;
  let count = 0;
  for (const meeting of meetings) {
    if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
      continue;
    }
    if (meeting.cancelled) continue;
    if ((meeting.date || "").trim() !== day) continue;
    if (!meetingHasInstructor(meeting, id)) continue;
    count += 1;
  }
  return count;
}

export function instructorPickerLabel(
  instructor: Pick<SchemaInstructor, "id" | "name_en" | "name_ru" | "email">,
): string {
  return (
    instructor.name_en?.trim() ||
    instructor.name_ru?.trim() ||
    instructor.email?.trim() ||
    String(instructor.id || "").trim() ||
    ""
  );
}

function normalizeHhmm(value: string | undefined): string {
  return String(value || "")
    .trim()
    .slice(0, 5);
}

function normalizeApiTime(value: string | undefined): string {
  const trimmed = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 8);
  return trimmed;
}

function resolveMeetingEnd(
  config: SchemaScheduleConfig,
  meeting: Meeting,
): string {
  const end = normalizeHhmm(meeting.end);
  if (end) return end;
  const start = normalizeHhmm(meeting.start);
  if (!start) return "";
  const resolved = normalizeHhmm(
    resolveEndTimeForStart(config, start, meeting.groups),
  );
  if (resolved) return resolved;
  return add90m(start);
}

function conflictMeetingLabel(meeting: Meeting): string {
  const title =
    String(meeting.course_short_name || meeting.course || "").trim() || "—";
  const tag = String(meeting.tag || "").trim();
  return tag ? `${title} (${tag})` : title;
}

function conflictGroupKey(meeting: Meeting): string {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (ref?.kind === "wp") {
    return `wp:${ref.courseIdx}:${ref.componentIdx}:${ref.seriesIdx}:${ref.slotIdx}`;
  }
  if (ref?.kind === "occ") {
    return `occ:${ref.courseIdx}:${ref.componentIdx}:${ref.seriesIdx}:${ref.occIdx}`;
  }
  const start = normalizeHhmm(meeting.start);
  const end = normalizeHhmm(meeting.end);
  return `fb:${conflictMeetingLabel(meeting)}|${start}|${end}|${meeting.date}`;
}

function isWeeklyPatternMeeting(meeting: Meeting): boolean {
  return parseMeetingInstanceId(meeting.instance_id)?.kind === "wp";
}

export function preferenceLevelForSlot(
  preferences: SchemaInstructorSlotPreferenceEntry[] | undefined,
  weekday: Weekday,
  start: string,
): InstructorSlotPreferenceLevel | null {
  const startApi = normalizeApiTime(start);
  if (!startApi || !preferences?.length) return null;
  for (const entry of preferences) {
    if (entry.weekday !== weekday) continue;
    if (normalizeApiTime(entry.start_time) !== startApi) continue;
    if (entry.level === InstructorSlotPreferenceLevel.neutral) return null;
    return entry.level;
  }
  return null;
}

export function instructorAvailabilityForSlot({
  config,
  meetings,
  instructorId,
  dates,
  start,
  end,
  weekday,
  preferences,
  excludeRef,
  excludeInstanceId,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  instructorId: string;
  dates: string[];
  start: string;
  end?: string;
  weekday: Weekday;
  preferences?: SchemaInstructorSlotPreferenceEntry[] | null;
  excludeRef?: MeetingRef | null;
  excludeInstanceId?: string | null;
}): InstructorAvailabilityInfo {
  const id = instructorId.trim();
  const proposedStart = normalizeHhmm(start);
  const proposedEnd =
    normalizeHhmm(end) ||
    (proposedStart
      ? normalizeHhmm(resolveEndTimeForStart(config, proposedStart)) ||
        add90m(proposedStart)
      : "");

  const dateSet = new Set(dates.map((d) => d.trim()).filter(Boolean));
  type RawHit = {
    date: string;
    weeklyPattern: boolean;
    meeting: RoomConflictMeeting;
  };
  const groups = new Map<string, RawHit[]>();

  if (id && proposedStart && proposedEnd && dateSet.size) {
    for (const meeting of meetings) {
      if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
        continue;
      }
      if (excludeRef && isSameLogicalMeeting(meeting, excludeRef)) continue;
      if (meeting.cancelled) continue;
      if (!meetingHasInstructor(meeting, id)) continue;
      const day = (meeting.date || "").trim();
      if (!dateSet.has(day)) continue;
      const otherStart = normalizeHhmm(meeting.start);
      const otherEnd = resolveMeetingEnd(config, meeting);
      if (!timesOverlap(proposedStart, proposedEnd, otherStart, otherEnd)) {
        continue;
      }
      const key = conflictGroupKey(meeting);
      const list = groups.get(key) || [];
      list.push({
        date: day,
        weeklyPattern: isWeeklyPatternMeeting(meeting),
        meeting: {
          label: conflictMeetingLabel(meeting),
          start: otherStart,
          end: otherEnd || undefined,
        },
      });
      groups.set(key, list);
    }
  }

  const conflicts: InstructorConflictDetail[] = [...groups.values()]
    .map((hits) => {
      const datesHit = [...new Set(hits.map((h) => h.date))].sort();
      const weekly = hits.some((h) => h.weeklyPattern) || datesHit.length >= 2;
      return {
        weekly,
        dates: datesHit,
        meeting: hits[0]!.meeting,
      };
    })
    .sort((a, b) => {
      if (a.weekly !== b.weekly) return a.weekly ? -1 : 1;
      return (a.dates[0] || "").localeCompare(b.dates[0] || "");
    });

  const preferenceLevel = preferenceLevelForSlot(
    preferences ?? undefined,
    weekday,
    proposedStart,
  );
  const preference: InstructorPreferenceIssue | null = preferenceLevel
    ? { level: preferenceLevel }
    : null;

  const hasWeeklyConflict = conflicts.some((conflict) => conflict.weekly);
  const onceConflicts = conflicts.filter((conflict) => !conflict.weekly);
  const isBanned = preferenceLevel === InstructorSlotPreferenceLevel.banned;
  const isDiscouraged =
    preferenceLevel === InstructorSlotPreferenceLevel.discouraged;

  let status: InstructorAvailabilityStatus = "green";
  if (isBanned || hasWeeklyConflict || conflicts.length >= 2) {
    status = "red";
  } else if (onceConflicts.length === 1 || isDiscouraged) {
    status = "orange";
  }

  return { status, conflicts, preference };
}

function statusSortRank(status: InstructorAvailabilityStatus): number {
  if (status === "green") return 0;
  if (status === "orange") return 1;
  return 2;
}

function preferenceSortRank(
  level: InstructorSlotPreferenceLevel | null | undefined,
): number {
  if (level === InstructorSlotPreferenceLevel.preferred) return 0;
  if (level == null || level === InstructorSlotPreferenceLevel.neutral) {
    return 1;
  }
  if (level === InstructorSlotPreferenceLevel.discouraged) return 2;
  return 3;
}

export function buildInstructorPickerOptions({
  config,
  meetings,
  date,
  dates,
  start,
  end,
  weekday,
  courseInstructors,
  excludeInstanceId,
  excludeRef,
  includeInstructorIds,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  /** Focus date for the daily-load hint. */
  date: string;
  /** Dates to check for timeslot conflicts. */
  dates: string[];
  start: string;
  end?: string;
  weekday: TermWeekdayKey;
  courseInstructors?: CourseInstructor[] | null;
  excludeInstanceId?: string | null;
  excludeRef?: MeetingRef | null;
  includeInstructorIds?: string[];
}): SelectDropdownOption[] {
  const byId = new Map<string, SchemaInstructor>();
  for (const instructor of config.instructors || []) {
    const id = String(instructor.id || "").trim();
    if (id) byId.set(id, instructor);
  }

  const roleById = new Map<string, string>();
  const preferredIds: string[] = [];
  const seenPreferred = new Set<string>();
  for (const entry of courseInstructors || []) {
    const id = String(entry.id || "").trim();
    if (!id || seenPreferred.has(id)) continue;
    seenPreferred.add(id);
    preferredIds.push(id);
    const role = String(entry.role || "").trim();
    if (role) roleById.set(id, role);
  }

  const otherIds = [...byId.keys()].filter((id) => !seenPreferred.has(id));

  const ids: string[] = [...preferredIds];
  for (const id of otherIds) ids.push(id);
  for (const raw of includeInstructorIds || []) {
    const id = raw.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }

  const apiWeekday = termWeekdayKeyToWeekday(weekday);

  const restrictToPreferred = preferredIds.length > 0;

  return ids
    .map((id) => {
      const instructor = byId.get(id);
      const label = instructor ? instructorPickerLabel(instructor) : id;
      const load = countInstructorDailyLoad(
        meetings,
        id,
        date,
        excludeInstanceId,
      );
      const role = roleById.get(id);
      const preferred = seenPreferred.has(id);
      const availability = instructorAvailabilityForSlot({
        config,
        meetings,
        instructorId: id,
        dates,
        start,
        end,
        weekday: apiWeekday,
        preferences: instructor?.slot_preferences,
        excludeRef,
        excludeInstanceId,
      });
      const hint = [role || null, `в этот день ${load} занятий`]
        .filter(Boolean)
        .join(", ");
      const searchText = [
        instructor?.name_en,
        instructor?.name_ru,
        instructor?.email,
        instructor?.alias,
        role,
        id,
      ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ");

      return {
        value: id,
        label: label || id,
        hint,
        searchText: searchText || undefined,
        startAdornment: createElement(InstructorAvailabilityStatusMark, {
          info: availability,
        }),
        requireSearch: restrictToPreferred && !preferred,
        preferred,
        status: availability.status,
        preferenceLevel: availability.preference?.level ?? null,
      };
    })
    .sort((a, b) => {
      const statusDiff = statusSortRank(a.status) - statusSortRank(b.status);
      if (statusDiff !== 0) return statusDiff;
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      const prefDiff =
        preferenceSortRank(a.preferenceLevel) -
        preferenceSortRank(b.preferenceLevel);
      if (prefDiff !== 0) return prefDiff;
      return a.label.localeCompare(b.label, "ru");
    })
    .map(
      ({ value, label, hint, searchText, startAdornment, requireSearch }) => ({
        value,
        label,
        hint,
        searchText: searchText || undefined,
        startAdornment,
        requireSearch: requireSearch || undefined,
      }),
    );
}

export function instructorPickerDatesForWeekday(
  config: SchemaScheduleConfig,
  weekday: TermWeekdayKey,
): string[] {
  return semesterDatesForWeekday(config, weekday);
}
