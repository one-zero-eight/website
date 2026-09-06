import type {
  SchemaScheduleConfig,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";

import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";
import type {
  RoomAvailabilityInfo,
  RoomConflictDetail,
} from "./roomPickerOptions.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import { resolveAudienceSemester } from "./programTimeSlots.ts";
import {
  findEditForMeetingDate,
  resolveWeeklyMeetingFields,
  semesterDatesForWeekday,
  weeklyPatternDayKey,
} from "./timetableViewerModel.ts";

export type MeetingPickerSlot = {
  date: string;
  start: string;
  end?: string;
};

export function preparePickerSelection(
  meetings: Meeting[],
  selection: Meeting[],
) {
  // Remove even cancelled targets' original versions before inserting active drafts.
  const selectedIds = new Set(selection.map((meeting) => meeting.instance_id));
  const otherMeetings = meetings.filter(
    (meeting) => !selectedIds.has(meeting.instance_id),
  );
  const targets = selection.filter((meeting) => !meeting.cancelled);
  return {
    targets,
    meetings: otherMeetings,
    index: buildMeetingPickerIndex(otherMeetings),
    dates: [
      ...new Set(targets.map((meeting) => meeting.date.trim()).filter(Boolean)),
    ].sort(),
  };
}

/** Overlay only the selected drafts; reuse the already indexed rest of the schedule. */
export function prospectivePickerIndex(
  baseIndex: MeetingPickerIndex,
  targets: Meeting[],
  replacement: Pick<Meeting, "room"> | Pick<Meeting, "instructors">,
): MeetingPickerIndex {
  const selectedIndex = buildMeetingPickerIndex(
    targets.map((meeting) => ({ ...meeting, ...replacement })),
  );
  function overlay(
    base: Map<string, Meeting[]>,
    additions: Map<string, Meeting[]>,
  ) {
    const result = new Map(base);
    for (const [key, meetings] of additions) {
      result.set(key, [...(base.get(key) ?? []), ...meetings]);
    }
    return result;
  }
  return {
    byRoomDate: overlay(baseIndex.byRoomDate, selectedIndex.byRoomDate),
    byInstructorDate: overlay(
      baseIndex.byInstructorDate,
      selectedIndex.byInstructorDate,
    ),
  };
}

type PickerAvailability = Pick<
  RoomAvailabilityInfo,
  "status" | "checkedDates" | "conflictDates" | "conflicts"
>;

export function mergePickerAvailability(
  results: PickerAvailability[],
): PickerAvailability {
  const conflictsByKey = new Map<string, RoomConflictDetail>();
  for (const result of results) {
    for (const conflict of result.conflicts) {
      const key = conflict.groupKey ?? JSON.stringify(conflict.meeting);
      const previous = conflictsByKey.get(key);
      const dates = [
        ...new Set([...(previous?.dates ?? []), ...conflict.dates]),
      ].sort();
      conflictsByKey.set(key, {
        ...conflict,
        dates,
        weekly: conflict.weekly || !!previous?.weekly || dates.length >= 2,
      });
    }
  }
  return {
    status: results.some((result) => result.status === "red")
      ? "red"
      : results.some((result) => result.status === "orange")
        ? "orange"
        : "green",
    checkedDates: [
      ...new Set(results.flatMap((result) => result.checkedDates)),
    ].sort(),
    conflictDates: [
      ...new Set(results.flatMap((result) => result.conflictDates)),
    ].sort(),
    conflicts: [...conflictsByKey.values()].sort((a, b) => {
      if (a.weekly !== b.weekly) return a.weekly ? -1 : 1;
      return (a.dates[0] ?? "").localeCompare(b.dates[0] ?? "");
    }),
  };
}

/** Dates/times affected by changing the base room or instructor of a weekly slot. */
export function weeklyPickerSlots(
  config: SchemaScheduleConfig,
  slot: SchemaWeeklyPatternSlot,
  audienceTokens: string[],
  resource: "room" | "instructor",
): MeetingPickerSlot[] {
  const weekday = weeklyPatternDayKey(String(slot.weekday));
  const range = resolveAudienceSemester(config, audienceTokens);
  if (!weekday || !range) return [];

  return semesterDatesForWeekday(config, weekday, range).flatMap((date) => {
    const edit = findEditForMeetingDate(
      date,
      slot.edits,
      config.term.starting_day ?? Weekday.MONDAY,
    );
    // An explicit resource override survives changes to the base slot.
    if (edit?.[resource] != null) return [];
    const resolved = resolveWeeklyMeetingFields(slot, date, config);
    if (resolved.cancelled) return [];
    return [{ date: resolved.date, start: resolved.start, end: resolved.end }];
  });
}
