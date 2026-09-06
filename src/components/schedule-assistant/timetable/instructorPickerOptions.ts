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
import { add90m, dayKey } from "./timetableViewerModel.ts";
import {
  mergePickerAvailability,
  preparePickerSelection,
  prospectivePickerIndex,
  type MeetingPickerSlot,
} from "./meetingPickerSchedule.ts";
import { formatPickerLoadHint } from "./pickerLabels.ts";
import {
  buildMeetingPickerIndex,
  meetingInstructorDateKey,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";

type CourseInstructor = NonNullable<SchemaCourseConfig["instructors"]>[number];

export type InstructorAvailabilityStatus = RoomAvailabilityStatus;

export type InstructorConflictDetail = RoomConflictDetail;

export type InstructorPreferenceIssue = {
  level: InstructorSlotPreferenceLevel;
};

export type InstructorAvailabilityInfo = {
  status: InstructorAvailabilityStatus;
  conflicts: InstructorConflictDetail[];
  checkedDates: string[];
  conflictDates: string[];
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
  isExcluded?: (meeting: Meeting) => boolean,
  index?: MeetingPickerIndex | null,
): number {
  const id = instructorId.trim();
  const day = date.trim();
  if (!id || !day) return 0;
  const candidates = index
    ? (index.byInstructorDate.get(meetingInstructorDateKey(id, day)) ?? [])
    : meetings;
  let count = 0;
  for (const meeting of candidates) {
    if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
      continue;
    }
    if (isExcluded?.(meeting)) continue;
    if (meeting.cancelled) continue;
    if (!index) {
      if ((meeting.date || "").trim() !== day) continue;
      if (!meetingHasInstructor(meeting, id)) continue;
    }
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
  slots,
  start,
  end,
  preferences,
  excludeRef,
  excludeInstanceId,
  index,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  instructorId: string;
  dates: string[];
  slots?: MeetingPickerSlot[];
  start: string;
  end?: string;
  weekday: Weekday;
  preferences?: SchemaInstructorSlotPreferenceEntry[] | null;
  excludeRef?: MeetingRef | null;
  excludeInstanceId?: string | null;
  index?: MeetingPickerIndex | null;
}): InstructorAvailabilityInfo {
  const id = instructorId.trim();
  const actualSlots = (slots ?? dates.map((date) => ({ date, start, end })))
    .map((slot) => {
      const proposedStart = normalizeHhmm(slot.start);
      return {
        date: slot.date.trim(),
        start: proposedStart,
        end:
          normalizeHhmm(slot.end) ||
          (proposedStart
            ? normalizeHhmm(resolveEndTimeForStart(config, proposedStart)) ||
              add90m(proposedStart)
            : ""),
      };
    })
    .filter((slot) => slot.date && slot.start && slot.end);
  const checkedDates = [
    ...new Set(actualSlots.map((slot) => slot.date)),
  ].sort();
  const dateSet = new Set(checkedDates);
  type RawHit = {
    date: string;
    weeklyPattern: boolean;
    meeting: RoomConflictMeeting;
  };
  const groups = new Map<string, RawHit[]>();

  if (id) {
    for (const slot of actualSlots) {
      const candidates = index
        ? (index.byInstructorDate.get(
            meetingInstructorDateKey(id, slot.date),
          ) ?? [])
        : meetings;
      for (const meeting of candidates) {
        if (excludeInstanceId && meeting.instance_id === excludeInstanceId)
          continue;
        if (excludeRef && isSameLogicalMeeting(meeting, excludeRef)) continue;
        if (meeting.cancelled) continue;
        if (!index) {
          if ((meeting.date || "").trim() !== slot.date) continue;
          if (!meetingHasInstructor(meeting, id)) continue;
        }
        const otherStart = normalizeHhmm(meeting.start);
        const otherEnd = resolveMeetingEnd(config, meeting);
        if (!timesOverlap(slot.start, slot.end, otherStart, otherEnd)) continue;
        const key = `${conflictGroupKey(meeting)}|${otherStart}|${otherEnd}`;
        const list = groups.get(key) || [];
        list.push({
          date: slot.date,
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
  }

  const conflicts: InstructorConflictDetail[] = [...groups.entries()]
    .map(([groupKey, hits]) => {
      const datesHit = [...new Set(hits.map((h) => h.date))].sort();
      const weekly = hits.some((h) => h.weeklyPattern) || datesHit.length >= 2;
      return {
        groupKey,
        weekly,
        dates: datesHit,
        meeting: hits[0]!.meeting,
      };
    })
    .sort((a, b) => {
      if (a.weekly !== b.weekly) return a.weekly ? -1 : 1;
      return (a.dates[0] || "").localeCompare(b.dates[0] || "");
    });

  const preferenceLevel =
    actualSlots
      .map((slot) =>
        preferenceLevelForSlot(
          preferences ?? undefined,
          termWeekdayKeyToWeekday(dayKey(slot.date)),
          slot.start,
        ),
      )
      .sort((a, b) => preferenceSortRank(b) - preferenceSortRank(a))[0] ?? null;
  const preference: InstructorPreferenceIssue | null = preferenceLevel
    ? { level: preferenceLevel }
    : null;

  const hasWeeklyConflict = conflicts.some((conflict) => conflict.weekly);
  const onceConflicts = conflicts.filter((conflict) => !conflict.weekly);
  const conflictDates = [
    ...new Set(conflicts.flatMap((conflict) => conflict.dates)),
  ].sort();
  const everyCheckedDateConflicts =
    dateSet.size > 0 && conflictDates.length >= dateSet.size;
  const isBanned = preferenceLevel === InstructorSlotPreferenceLevel.banned;
  const isDiscouraged =
    preferenceLevel === InstructorSlotPreferenceLevel.discouraged;

  let status: InstructorAvailabilityStatus = "green";
  if (
    isBanned ||
    hasWeeklyConflict ||
    conflicts.length >= 2 ||
    everyCheckedDateConflicts
  ) {
    status = "red";
  } else if (onceConflicts.length === 1 || isDiscouraged) {
    status = "orange";
  }

  return { status, conflicts, checkedDates, conflictDates, preference };
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
  selection,
  dates,
  weekly,
  slots,
  start,
  end,
  weekday,
  courseInstructors,
  instructorPool,
  excludeInstanceId,
  excludeRef,
  includeInstructorIds,
  index: indexArg,
  includeStatus = true,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  /** Active draft targets; when supplied, overrides dates, slots and exclusions. */
  selection?: Meeting[];
  /** Dates to check for timeslot conflicts and daily load. */
  dates: string[];
  weekly: boolean;
  slots?: MeetingPickerSlot[];
  start: string;
  end?: string;
  weekday: TermWeekdayKey;
  courseInstructors?: CourseInstructor[] | null;
  /** Component instructor_pool entries (string | string[]). */
  instructorPool?: unknown[] | null;
  excludeInstanceId?: string | null;
  excludeRef?: MeetingRef | null;
  includeInstructorIds?: string[];
  index?: MeetingPickerIndex | null;
  /** When false, skip conflict scoring and show gray pending dots. */
  includeStatus?: boolean;
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

  const poolIdSet = new Set<string>();
  for (const entry of instructorPool ?? []) {
    if (Array.isArray(entry)) {
      for (const id of entry) {
        const value = String(id || "").trim();
        if (value) poolIdSet.add(value);
      }
      continue;
    }
    const value = String(entry || "").trim();
    if (value) poolIdSet.add(value);
  }

  const includeSet = new Set(
    (includeInstructorIds || []).map((id) => id.trim()).filter(Boolean),
  );

  const visibleWithoutSearch = new Set<string>([
    ...seenPreferred,
    ...poolIdSet,
  ]);

  const otherIds = [...byId.keys()].filter(
    (id) => !visibleWithoutSearch.has(id),
  );

  const ids: string[] = [...preferredIds];
  for (const id of poolIdSet) {
    if (!ids.includes(id)) ids.push(id);
  }
  for (const id of otherIds) ids.push(id);
  for (const id of includeSet) {
    if (!ids.includes(id)) ids.push(id);
  }

  const selectedSchedule = selection
    ? preparePickerSelection(meetings, selection)
    : null;
  const loadMeetings = selectedSchedule?.meetings ?? meetings;
  const loadExcludeInstanceId = selectedSchedule
    ? undefined
    : excludeInstanceId;
  const apiWeekday = termWeekdayKeyToWeekday(weekday);
  const actualDates = (
    selectedSchedule?.dates ??
    slots?.map((slot) => slot.date) ??
    dates
  )
    .map((date) => date.trim())
    .filter(Boolean);

  const restrictCatalog = true;
  const isExcluded =
    !selectedSchedule && excludeRef
      ? (meeting: Meeting) => isSameLogicalMeeting(meeting, excludeRef)
      : undefined;
  const index = includeStatus
    ? (selectedSchedule?.index ?? indexArg ?? buildMeetingPickerIndex(meetings))
    : null;

  return ids
    .map((id) => {
      const instructor = byId.get(id);
      const label = instructor ? instructorPickerLabel(instructor) : id;
      const role = roleById.get(id);
      const preferred = seenPreferred.has(id);
      const inPool = poolIdSet.has(id);
      let availability: InstructorAvailabilityInfo | null = null;
      if (includeStatus && selectedSchedule) {
        const candidateIndex = prospectivePickerIndex(
          selectedSchedule.index,
          selectedSchedule.targets,
          { instructors: [id] },
        );
        const results = selectedSchedule.targets.map((target) =>
          instructorAvailabilityForSlot({
            config,
            meetings: selectedSchedule.meetings,
            instructorId: id,
            dates: [target.date],
            start: target.start,
            end: resolveMeetingEnd(config, target),
            weekday: termWeekdayKeyToWeekday(dayKey(target.date)),
            preferences: instructor?.slot_preferences,
            excludeInstanceId: target.instance_id,
            index: candidateIndex,
          }),
        );
        availability = {
          ...mergePickerAvailability(results),
          preference:
            results
              .map((result) => result.preference)
              .sort(
                (a, b) =>
                  preferenceSortRank(b?.level) - preferenceSortRank(a?.level),
              )[0] ?? null,
        };
      } else if (includeStatus) {
        availability = instructorAvailabilityForSlot({
          config,
          meetings,
          instructorId: id,
          dates,
          slots,
          start,
          end,
          weekday: apiWeekday,
          preferences: instructor?.slot_preferences,
          excludeRef,
          excludeInstanceId,
          index,
        });
      }
      const loadHint =
        includeStatus || !actualDates.length
          ? formatPickerLoadHint(
              actualDates,
              (date) =>
                countInstructorDailyLoad(
                  loadMeetings,
                  id,
                  date,
                  loadExcludeInstanceId,
                  isExcluded,
                  index,
                ),
              weekly,
            )
          : null;
      const hint = [role, loadHint].filter(Boolean).join(" · ");
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
        requireSearch: restrictCatalog && !visibleWithoutSearch.has(id),
        preferred,
        inPool,
        status: availability?.status ?? null,
        preferenceLevel: availability?.preference?.level ?? null,
      };
    })
    .sort((a, b) => {
      if (includeStatus && a.status && b.status) {
        const statusDiff = statusSortRank(a.status) - statusSortRank(b.status);
        if (statusDiff !== 0) return statusDiff;
      }
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      if (a.inPool !== b.inPool) return a.inPool ? -1 : 1;
      if (includeStatus) {
        const prefDiff =
          preferenceSortRank(a.preferenceLevel) -
          preferenceSortRank(b.preferenceLevel);
        if (prefDiff !== 0) return prefDiff;
      }
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

/** Best free instructor for a slot: preferred/pool, green, preference-aware. */
export function suggestBestInstructorId({
  config,
  meetings,
  dates,
  slots,
  start,
  end,
  weekday,
  courseInstructors,
  instructorPool,
  index,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  dates: string[];
  slots?: MeetingPickerSlot[];
  start: string;
  end?: string;
  weekday: TermWeekdayKey;
  courseInstructors?: CourseInstructor[] | null;
  instructorPool?: unknown[] | null;
  index?: MeetingPickerIndex | null;
}): string | null {
  const startHhmm = String(start || "")
    .trim()
    .slice(0, 5);
  const hasActualSlots = slots
    ? slots.some((slot) => slot.date.trim() && normalizeHhmm(slot.start))
    : Boolean(startHhmm && dates.some((date) => date.trim()));
  if (!hasActualSlots) return null;

  const byId = new Map<string, SchemaInstructor>();
  for (const instructor of config.instructors || []) {
    const id = String(instructor.id || "").trim();
    if (id) byId.set(id, instructor);
  }

  const preferredIds: string[] = [];
  const seenPreferred = new Set<string>();
  for (const entry of courseInstructors || []) {
    const id = String(entry.id || "").trim();
    if (!id || seenPreferred.has(id)) continue;
    seenPreferred.add(id);
    preferredIds.push(id);
  }

  const poolIdSet = new Set<string>();
  for (const entry of instructorPool ?? []) {
    if (Array.isArray(entry)) {
      for (const id of entry) {
        const value = String(id || "").trim();
        if (value) poolIdSet.add(value);
      }
      continue;
    }
    const value = String(entry || "").trim();
    if (value) poolIdSet.add(value);
  }

  const candidateIds = [
    ...preferredIds,
    ...[...poolIdSet].filter((id) => !seenPreferred.has(id)),
  ];
  if (!candidateIds.length) return null;

  const apiWeekday = termWeekdayKeyToWeekday(weekday);
  const pickerIndex = index ?? buildMeetingPickerIndex(meetings);

  const ranked = candidateIds
    .map((id) => {
      const instructor = byId.get(id);
      const availability = instructorAvailabilityForSlot({
        config,
        meetings,
        instructorId: id,
        dates,
        slots,
        start: startHhmm,
        end: end?.slice(0, 5) || undefined,
        weekday: apiWeekday,
        preferences: instructor?.slot_preferences,
        index: pickerIndex,
      });
      return {
        id,
        preferred: seenPreferred.has(id),
        inPool: poolIdSet.has(id),
        status: availability.status,
        preferenceLevel: availability.preference?.level ?? null,
        label: instructor ? instructorPickerLabel(instructor) : id,
      };
    })
    .filter((item) => item.status === "green")
    .sort((a, b) => {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      if (a.inPool !== b.inPool) return a.inPool ? -1 : 1;
      const prefDiff =
        preferenceSortRank(a.preferenceLevel) -
        preferenceSortRank(b.preferenceLevel);
      if (prefDiff !== 0) return prefDiff;
      return a.label.localeCompare(b.label, "ru");
    });

  return ranked[0]?.id ?? null;
}
