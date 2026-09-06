import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";

import { weeklyPickerSlots } from "./meetingPickerSchedule.ts";
import {
  createOccurrenceEvent,
  editableEventsToDraftMeetings,
  editableSessionEventInstanceId,
} from "./editableSessionEvents.ts";
import type { MeetingRef } from "./meetingEditUtils.ts";
import {
  buildInstructorPickerOptions,
  instructorAvailabilityForSlot,
} from "./instructorPickerOptions.ts";
import {
  buildRoomPickerOptions,
  roomAvailabilityForSlot,
  countRoomDailyLoad,
} from "./roomPickerOptions.ts";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const config = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
    days: [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
    ],
    starting_day: Weekday.MONDAY,
    time_slots: [{ start_time: "16:00:00", end_time: "17:30:00" }],
    sections: [
      {
        code: "core",
        name: "Core",
        programs: [
          {
            code: "B25",
            name: "B25",
            semester: { start_date: "2026-09-07", end_date: "2026-09-30" },
            tracks: [{ code: "CSE", name: "CSE", groups: ["B25-CSE-04"] }],
          },
        ],
      },
    ],
  },
  students_groups: [
    { code: "B25-CSE-04", name: "B25-CSE-04", estimated_size: 20 },
  ],
  rooms: [{ id: "304", capacity: 25 }],
  instructors: [],
  courses: [],
} as unknown as SchemaScheduleConfig;
const slot: SchemaWeeklyPatternSlot = {
  weekday: Weekday.FRIDAY,
  start_time: "16:00:00",
  end_time: "17:30:00",
  room: "304",
  instructor: "teacher",
};
function meeting(date: string, overrides: Partial<Meeting> = {}): Meeting {
  return {
    instance_id: `0:0:0:wp:0:${date}`,
    course: "ML",
    tag: "lab",
    groups: [],
    date,
    start: "16:00",
    end: "17:30",
    room: "304",
    instructors: ["teacher"],
    instructor_pool: [],
    section: "core",
    ...overrides,
  };
}

describe("picker schedule", () => {
  it("keeps moved sibling weeks as conflicts when excluding one instance", () => {
    const date = "2026-09-11";
    const current = meeting(date);
    const sibling = meeting(date, { instance_id: "0:0:0:wp:0:2026-09-18" });
    const info = roomAvailabilityForSlot({
      config,
      meetings: [current, sibling],
      roomId: "304",
      dates: [date],
      start: "16:00",
      end: "17:30",
      audienceSize: 20,
      capacity: 25,
      excludeInstanceId: current.instance_id,
    });
    expect(info.conflictDates).toEqual([date]);
    expect(
      countRoomDailyLoad([current, sibling], "304", date, current.instance_id),
    ).toBe(1);
  });

  it("gives new occurrences stable distinct identities for self-exclusion", () => {
    const meetingRef: MeetingRef = {
      kind: "occ",
      courseIdx: 0,
      componentIdx: 0,
      seriesIdx: 0,
      occIdx: 0,
    };
    const events = [
      createOccurrenceEvent({ date: "2026-09-11" }),
      createOccurrenceEvent({ date: "2026-09-11" }),
    ];
    const drafts = editableEventsToDraftMeetings({
      events,
      meeting: meeting("2026-09-11"),
      meetingRef,
      audienceTokens: [],
    });
    expect(new Set(drafts.map((item) => item.instance_id)).size).toBe(2);
    expect(drafts.map((item) => item.instance_id)).toEqual(
      events.map((event) => editableSessionEventInstanceId(event, meetingRef)),
    );
  });

  it("uses matching load and conflict dates for instructor options", () => {
    const dates = ["2026-09-04", "2026-09-11"];
    const meetings = [meeting(dates[1]!)];
    const options = buildInstructorPickerOptions({
      config,
      meetings,
      dates,
      weekly: true,
      start: "16:00",
      end: "17:30",
      weekday: "Fri",
      includeInstructorIds: ["teacher"],
    });
    expect(options.find((option) => option.value === "teacher")?.hint).toBe(
      "0–1 занятие по пятницам",
    );
    const info = instructorAvailabilityForSlot({
      config,
      meetings,
      dates,
      start: "16:00",
      end: "17:30",
      weekday: Weekday.FRIDAY,
      instructorId: "teacher",
    });
    expect(info.checkedDates).toEqual(dates);
    expect(info.conflictDates).toEqual([dates[1]]);
  });

  it("uses the audience teaching window instead of the first term Friday", () => {
    expect(
      weeklyPickerSlots(config, slot, ["B25-CSE-04"], "room").map(
        (item) => item.date,
      ),
    ).toEqual(["2026-09-11", "2026-09-18", "2026-09-25"]);
  });

  it("resolves cancellations and moved dates/times and skips fixed resource overrides", () => {
    const edited = {
      ...slot,
      edits: [
        { select_week: "2026-09-07", cancel: true },
        {
          select_week: "2026-09-14",
          cancel: false,
          date: "2026-09-17",
          start_time: "09:00:00",
          end_time: "10:30:00",
        },
        { select_week: "2026-09-21", cancel: false, room: "108" },
      ],
    };
    expect(weeklyPickerSlots(config, edited, ["B25-CSE-04"], "room")).toEqual([
      { date: "2026-09-17", start: "09:00", end: "10:30" },
    ]);
    expect(
      weeklyPickerSlots(config, edited, ["B25-CSE-04"], "instructor").map(
        (item) => item.date,
      ),
    ).toEqual(["2026-09-17", "2026-09-25"]);
  });

  it("uses all checked dates for weekly load, including zero-load days", () => {
    const dates = ["2026-09-04", "2026-09-11"];
    const options = buildRoomPickerOptions({
      config,
      meetings: [meeting(dates[1]!)],
      dates,
      weekly: true,
      start: "16:00",
      end: "17:30",
    });
    expect(options.find((option) => option.value === "304")?.hint).toBe(
      "Вместимость 25 · 0–1 занятие по пятницам",
    );
    const daily = buildRoomPickerOptions({
      config,
      meetings: [meeting(dates[1]!)],
      dates: [dates[1]!],
      weekly: false,
      start: "16:00",
      end: "17:30",
    });
    expect(daily.find((option) => option.value === "304")?.hint).toBe(
      "Вместимость 25 · 1 занятие за день",
    );
  });

  it.each([false, true])(
    "checks moved meeting times and reports exact coverage (indexed: %s)",
    (indexed) => {
      const meetings = [
        meeting("2026-09-17", { start: "09:00", end: "10:30" }),
        meeting("2026-09-25", { cancelled: true }),
      ];
      const info = roomAvailabilityForSlot({
        config,
        meetings,
        roomId: "304",
        dates: [],
        slots: [
          { date: "2026-09-17", start: "09:00", end: "10:30" },
          { date: "2026-09-25", start: "16:00", end: "17:30" },
        ],
        start: "16:00",
        end: "17:30",
        capacity: 25,
        audienceSize: 20,
        index: indexed ? buildMeetingPickerIndex(meetings) : undefined,
      });
      expect(info.checkedDates).toEqual(["2026-09-17", "2026-09-25"]);
      expect(info.conflictDates).toEqual(["2026-09-17"]);
    },
  );

  it("does not replace an empty schedule with a focus date", () => {
    const info = roomAvailabilityForSlot({
      config,
      meetings: [meeting("2026-09-04")],
      roomId: "304",
      dates: ["2026-09-04"],
      slots: [],
      start: "16:00",
      audienceSize: 20,
      capacity: 25,
    });
    expect(info.checkedDates).toEqual([]);
    expect(info.conflicts).toEqual([]);
    const options = buildRoomPickerOptions({
      config,
      meetings: [],
      dates: [],
      weekly: true,
      start: "16:00",
    });
    expect(options.find((option) => option.value === "304")?.hint).toBe(
      "Вместимость 25 · Нет дат проведения",
    );
  });

  it("excludes the edited slot and cancelled instances from daily load", () => {
    const date = "2026-09-11";
    const meetings = [
      meeting(date),
      meeting(date, { instance_id: "other", cancelled: true }),
      meeting(date, { instance_id: "sibling" }),
    ];
    expect(
      countRoomDailyLoad(
        meetings,
        "304",
        date,
        meetings[0]!.instance_id,
        undefined,
        buildMeetingPickerIndex(meetings),
      ),
    ).toBe(1);
  });
});
