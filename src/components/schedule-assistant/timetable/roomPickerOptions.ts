import { createElement } from "react";

import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import type { SelectDropdownOption } from "@/components/common/SelectDropdown.tsx";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { RoomAttributesHoverBadge } from "@/components/schedule-assistant/settings/rooms/RoomAttributesHoverBadge.tsx";
import { listRoomFeatureEntries } from "@/components/schedule-assistant/settings/rooms/roomAttributes.ts";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";

import {
  parseMeetingInstanceId,
  resolveEndTimeForStart,
  type MeetingRef,
} from "./meetingEditUtils.ts";
import { RoomAvailabilityStatusMark } from "./RoomAvailabilityStatusMark.tsx";
import type { Meeting } from "./timetableViewerModel.ts";
import {
  add90m,
  semesterDatesForWeekday,
  toMinutes,
} from "./timetableViewerModel.ts";
import {
  buildMeetingPickerIndex,
  meetingRoomDateKey,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";

export type RoomAvailabilityStatus = "green" | "orange" | "red";

/** Virtual location — does not consume a physical room (matches backend VIRTUAL_ROOM_ID). */
export const VIRTUAL_ROOM_ID = "ONLINE";

export function isVirtualRoom(roomId: string | null | undefined): boolean {
  const room = String(roomId || "")
    .trim()
    .toLocaleUpperCase("en-US");
  return room === VIRTUAL_ROOM_ID || room === "ОНЛАЙН";
}

export type RoomConflictMeeting = {
  label: string;
  start: string;
  end?: string;
};

/** One logical conflict (single date or aggregated weekly series). */
export type RoomConflictDetail = {
  weekly: boolean;
  dates: string[];
  meeting: RoomConflictMeeting;
};

export type RoomAvailabilityInfo = {
  status: RoomAvailabilityStatus;
  conflictDates: string[];
  conflicts: RoomConflictDetail[];
  capacityIssue: { capacity: number; needed: number } | null;
};

export function countRoomDailyLoad(
  meetings: Meeting[],
  roomId: string,
  date: string,
  excludeInstanceId?: string | null,
  isExcluded?: (meeting: Meeting) => boolean,
  index?: MeetingPickerIndex | null,
): number {
  const room = roomId.trim();
  const day = date.trim();
  if (!room || !day) return 0;
  const candidates = index
    ? (index.byRoomDate.get(meetingRoomDateKey(room, day)) ?? [])
    : meetings;
  let count = 0;
  for (const meeting of candidates) {
    if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
      continue;
    }
    if (isExcluded?.(meeting)) continue;
    if (meeting.cancelled) continue;
    if (!index) {
      if ((meeting.room || "").trim() !== room) continue;
      if ((meeting.date || "").trim() !== day) continue;
    }
    count += 1;
  }
  return count;
}

export function audienceSizeForTokens(
  config: SchemaScheduleConfig,
  audienceTokens: string[] | undefined,
): number | null {
  const tokens = (audienceTokens || [])
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  const groupIds = expandStudentGroupSelectors(config, tokens);
  if (!groupIds.length) return null;

  const sizeById = new Map(
    (config.students_groups || []).map((group) => [
      String(group.code || "").trim(),
      group.estimated_size,
    ]),
  );

  let total = 0;
  let known = false;
  for (const groupId of groupIds) {
    const size = sizeById.get(groupId);
    if (size == null || !Number.isFinite(size)) continue;
    total += size;
    known = true;
  }
  return known ? total : null;
}

export function isSameLogicalMeeting(
  meeting: Meeting,
  excludeRef: MeetingRef,
): boolean {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref) return false;
  if (
    ref.courseIdx !== excludeRef.courseIdx ||
    ref.componentIdx !== excludeRef.componentIdx ||
    ref.seriesIdx !== excludeRef.seriesIdx
  ) {
    return false;
  }
  // Weekly slots: only the same slot across dates (other slots stay real conflicts).
  if (excludeRef.kind === "wp" && ref.kind === "wp") {
    return ref.slotIdx === excludeRef.slotIdx;
  }
  // Occurrences: only the same date row (overlapping sibling dates are conflicts).
  if (excludeRef.kind === "occ" && ref.kind === "occ") {
    return ref.occIdx === excludeRef.occIdx;
  }
  return false;
}

function normalizeHhmm(value: string | undefined): string {
  return String(value || "")
    .trim()
    .slice(0, 5);
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

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = toMinutes(normalizeHhmm(startA));
  const aEnd = toMinutes(normalizeHhmm(endA));
  const bStart = toMinutes(normalizeHhmm(startB));
  const bEnd = toMinutes(normalizeHhmm(endB));
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

function conflictMeetingLabel(meeting: Meeting): string {
  const title =
    String(meeting.course_short_name || meeting.course || "").trim() || "—";
  const tag = String(meeting.tag || "").trim();
  return tag ? `${title} (${tag})` : title;
}

/** Group key for aggregating the same weekly slot / occurrence across dates. */
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

export function roomAvailabilityForSlot({
  config,
  meetings,
  roomId,
  dates,
  start,
  end,
  audienceSize,
  capacity,
  excludeRef,
  excludeInstanceId,
  index,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  roomId: string;
  dates: string[];
  start: string;
  end?: string;
  audienceSize: number | null;
  capacity: number | null | undefined;
  excludeRef?: MeetingRef | null;
  excludeInstanceId?: string | null;
  index?: MeetingPickerIndex | null;
}): RoomAvailabilityInfo {
  const room = roomId.trim();
  if (isVirtualRoom(room)) {
    return {
      status: "green",
      conflictDates: [],
      conflicts: [],
      capacityIssue: null,
    };
  }

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

  if (room && proposedStart && proposedEnd && dateSet.size) {
    const consider = (meeting: Meeting, day: string) => {
      if (excludeInstanceId && meeting.instance_id === excludeInstanceId) {
        return;
      }
      if (excludeRef && isSameLogicalMeeting(meeting, excludeRef)) return;
      if (meeting.cancelled) return;
      const otherStart = normalizeHhmm(meeting.start);
      const otherEnd = resolveMeetingEnd(config, meeting);
      if (!timesOverlap(proposedStart, proposedEnd, otherStart, otherEnd)) {
        return;
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
    };

    if (index) {
      for (const day of dateSet) {
        const list = index.byRoomDate.get(meetingRoomDateKey(room, day)) || [];
        for (const meeting of list) consider(meeting, day);
      }
    } else {
      for (const meeting of meetings) {
        if ((meeting.room || "").trim() !== room) continue;
        const day = (meeting.date || "").trim();
        if (!dateSet.has(day)) continue;
        consider(meeting, day);
      }
    }
  }

  const conflicts: RoomConflictDetail[] = [...groups.values()]
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

  const conflictDates = [
    ...new Set(conflicts.flatMap((conflict) => conflict.dates)),
  ].sort();

  const capacityIssue =
    audienceSize != null &&
    audienceSize > 0 &&
    capacity != null &&
    capacity < audienceSize
      ? { capacity, needed: audienceSize }
      : null;

  const hasWeeklyConflict = conflicts.some((conflict) => conflict.weekly);
  const onceConflicts = conflicts.filter((conflict) => !conflict.weekly);
  // Date-pattern checks use one date: any hit is a hard conflict (red).
  // Weekly checks across many dates: a single once-hit stays orange.
  const everyCheckedDateConflicts =
    dateSet.size > 0 && conflictDates.length >= dateSet.size;

  let status: RoomAvailabilityStatus = "green";
  if (
    capacityIssue ||
    hasWeeklyConflict ||
    conflictDates.length >= 2 ||
    everyCheckedDateConflicts
  ) {
    status = "red";
  } else if (onceConflicts.length === 1 || conflictDates.length === 1) {
    status = "orange";
  }

  return { status, conflictDates, conflicts, capacityIssue };
}

function statusSortRank(status: RoomAvailabilityStatus): number {
  if (status === "green") return 0;
  if (status === "orange") return 1;
  return 2;
}

function roomSortKey(
  capacity: number | null | undefined,
  audienceSize: number | null,
): [number, number] {
  if (audienceSize != null && audienceSize > 0) {
    if (capacity != null && capacity >= audienceSize) {
      // Suitable: smallest capacity first.
      return [0, capacity];
    }
    if (capacity != null) {
      // Too small: fewest missing seats first.
      return [1, audienceSize - capacity];
    }
    return [2, Number.POSITIVE_INFINITY];
  }
  if (capacity != null) return [0, capacity];
  return [1, Number.POSITIVE_INFINITY];
}

export function roomPickerDatesForEdit({
  config,
  weekday,
}: {
  config: SchemaScheduleConfig;
  weekday: TermWeekdayKey;
}): string[] {
  // Always check the full weekday series so recurring weekly clashes
  // show as multi-date (red), independent of edit apply-scope.
  return semesterDatesForWeekday(config, weekday);
}

export function buildRoomPickerOptions({
  config,
  meetings,
  date,
  dates,
  start,
  end,
  audienceTokens,
  excludeInstanceId,
  excludeRef,
  includeRoomIds,
  index: indexArg,
  includeStatus = true,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  /** Focus date for the daily-load hint. */
  date: string;
  /** Dates to check for timeslot conflicts. */
  dates: string[];
  start: string;
  end?: string;
  audienceTokens?: string[];
  excludeInstanceId?: string | null;
  excludeRef?: MeetingRef | null;
  includeRoomIds?: string[];
  index?: MeetingPickerIndex | null;
  /** When false, skip conflict scoring and show gray pending dots. */
  includeStatus?: boolean;
}): SelectDropdownOption[] {
  const roomsById = new Map(
    (config.rooms || [])
      .map((room) => [String(room.id || "").trim(), room] as const)
      .filter(([id]) => !!id),
  );

  const ids = new Set<string>();
  ids.add(VIRTUAL_ROOM_ID);
  for (const id of roomsById.keys()) ids.add(id);
  for (const id of includeRoomIds || []) {
    const trimmed = id.trim();
    if (trimmed) ids.add(trimmed);
  }

  const audienceSize = audienceSizeForTokens(config, audienceTokens);
  const attributeKeys = (config.term?.room_attributes ?? [])
    .map((item) => item.key.trim())
    .filter(Boolean);
  const isExcluded = excludeRef
    ? (meeting: Meeting) => isSameLogicalMeeting(meeting, excludeRef)
    : undefined;
  const index = includeStatus
    ? (indexArg ?? buildMeetingPickerIndex(meetings))
    : null;

  return [...ids]
    .map((roomId) => {
      const room = roomsById.get(roomId);
      const featureEntries = listRoomFeatureEntries(
        room?.features,
        attributeKeys,
      );
      const availability = includeStatus
        ? roomAvailabilityForSlot({
            config,
            meetings,
            roomId,
            dates,
            start,
            end,
            audienceSize,
            capacity: room?.capacity,
            excludeRef,
            excludeInstanceId,
            index,
          })
        : null;
      const load = includeStatus
        ? countRoomDailyLoad(
            meetings,
            roomId,
            date,
            excludeInstanceId,
            isExcluded,
            index,
          )
        : null;
      const hint = [
        room?.capacity != null ? `Вместимость ${room.capacity}` : null,
        load != null ? `в этот день ${load} занятий` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        value: roomId,
        label: roomId,
        hint: hint || undefined,
        searchText: featureEntries
          .map((entry) => `${entry.key} ${entry.label}`)
          .join(" "),
        startAdornment: createElement(RoomAvailabilityStatusMark, {
          info: availability,
        }),
        endAdornment: featureEntries.length
          ? createElement(RoomAttributesHoverBadge, {
              entries: featureEntries,
            })
          : undefined,
        capacity: room?.capacity ?? null,
        status: availability?.status ?? null,
      };
    })
    .sort((a, b) => {
      if (a.value === VIRTUAL_ROOM_ID) return -1;
      if (b.value === VIRTUAL_ROOM_ID) return 1;
      if (includeStatus && a.status && b.status) {
        const statusDiff = statusSortRank(a.status) - statusSortRank(b.status);
        if (statusDiff !== 0) return statusDiff;
      }
      const [tierA, capA] = roomSortKey(a.capacity, audienceSize);
      const [tierB, capB] = roomSortKey(b.capacity, audienceSize);
      if (tierA !== tierB) return tierA - tierB;
      if (capA !== capB) return capA - capB;
      return a.value.localeCompare(b.value, "ru");
    })
    .map(
      ({ value, label, hint, searchText, startAdornment, endAdornment }) => ({
        value,
        label,
        hint,
        searchText: searchText || undefined,
        startAdornment,
        endAdornment,
      }),
    );
}

/** Best free physical room for a slot (green, capacity-fit). Skips ONLINE. */
export function suggestBestRoomId({
  config,
  meetings,
  date,
  dates,
  start,
  end,
  audienceTokens,
  index,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  date: string;
  dates: string[];
  start: string;
  end?: string;
  audienceTokens?: string[];
  index?: MeetingPickerIndex | null;
}): string | null {
  const startHhmm = String(start || "")
    .trim()
    .slice(0, 5);
  if (!date.trim() || !startHhmm || !dates.length) return null;

  const roomsById = new Map(
    (config.rooms || [])
      .map((room) => [String(room.id || "").trim(), room] as const)
      .filter(([id]) => !!id),
  );
  const audienceSize = audienceSizeForTokens(config, audienceTokens);
  const pickerIndex = index ?? buildMeetingPickerIndex(meetings);

  const ranked = [...roomsById.entries()]
    .filter(([roomId]) => !isVirtualRoom(roomId))
    .map(([roomId, room]) => {
      const availability = roomAvailabilityForSlot({
        config,
        meetings,
        roomId,
        dates,
        start: startHhmm,
        end: end?.slice(0, 5) || undefined,
        audienceSize,
        capacity: room.capacity,
        index: pickerIndex,
      });
      return {
        roomId,
        capacity: room.capacity ?? null,
        status: availability.status,
      };
    })
    .filter((item) => item.status === "green")
    .sort((a, b) => {
      const [tierA, capA] = roomSortKey(a.capacity, audienceSize);
      const [tierB, capB] = roomSortKey(b.capacity, audienceSize);
      if (tierA !== tierB) return tierA - tierB;
      if (capA !== capB) return capA - capB;
      return a.roomId.localeCompare(b.roomId, "ru");
    });

  return ranked[0]?.roomId ?? null;
}
