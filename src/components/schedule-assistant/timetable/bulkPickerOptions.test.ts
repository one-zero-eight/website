import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import {
  InstructorSlotPreferenceLevel,
  Weekday,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import type { SelectDropdownOption } from "@/components/common/SelectDropdown.tsx";

import {
  buildInstructorPickerOptions,
  type InstructorAvailabilityInfo,
} from "./instructorPickerOptions.ts";
import { buildMeetingPickerIndex } from "./meetingPickerIndex.ts";
import {
  buildRoomPickerOptions,
  type RoomAvailabilityInfo,
} from "./roomPickerOptions.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const firstDate = "2026-09-11";
const secondDate = "2026-09-18";
const config = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
    days: [Weekday.MONDAY, Weekday.FRIDAY],
    time_slots: [{ start_time: "16:00:00", end_time: "17:30:00" }],
  },
  students_groups: [
    { code: "small", name: "Small", estimated_size: 20 },
    { code: "large", name: "Large", estimated_size: 40 },
  ],
  rooms: [
    { id: "304", capacity: 25 },
    { id: "108", capacity: 50 },
  ],
  instructors: [
    { id: "teacher", name_en: "Teacher" },
    { id: "other", name_en: "Other" },
  ],
  courses: [],
} as unknown as SchemaScheduleConfig;

function meeting(
  instanceId: string,
  date: string,
  overrides: Partial<Meeting> = {},
): Meeting {
  return {
    instance_id: instanceId,
    course: "ML",
    tag: "lab",
    groups: ["small"],
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

function availability<T>(options: SelectDropdownOption[], id: string): T {
  const option = options.find((option) => option.value === id);
  return (option!.startAdornment as ReactElement<{ info: T }>).props.info;
}

function roomOptions(meetings: Meeting[], selection?: Meeting[]) {
  return buildRoomPickerOptions({
    config,
    meetings,
    selection,
    dates: [firstDate],
    weekly: true,
    start: "16:00",
    audienceTokens: ["small"],
    index: buildMeetingPickerIndex(meetings),
  });
}

function instructorOptions(
  meetings: Meeting[],
  selection?: Meeting[],
  configuration = config,
) {
  return buildInstructorPickerOptions({
    config: configuration,
    meetings,
    selection,
    dates: [firstDate],
    weekly: true,
    start: "16:00",
    weekday: "Fri",
    index: buildMeetingPickerIndex(meetings),
  });
}

const pickers = [
  { name: "room", build: roomOptions, id: "304" },
  { name: "instructor", build: instructorOptions, id: "teacher" },
];

describe.each(pickers)("bulk $name candidates", ({ build, id }) => {
  it("checks the actual second draft date/time and merges full coverage with a red status", () => {
    const selection = [
      meeting("selected-a", firstDate),
      meeting("selected-b", secondDate, { start: "09:00", end: "10:30" }),
    ];
    const options = build(
      [meeting("conflict", secondDate, { start: "09:30", end: "11:00" })],
      selection,
    );
    const info = availability<RoomAvailabilityInfo>(options, id);
    expect(info.status).toBe("red");
    expect(info.checkedDates).toEqual([firstDate, secondDate]);
    expect(info.conflictDates).toEqual([secondDate]);
    expect(info.conflicts).toHaveLength(1);
    expect(info.conflicts[0].dates).toEqual([secondDate]);
    expect(options.find((option) => option.value === id)?.hint).toContain(
      "0–1 занятие по пятницам",
    );
  });

  it("removes every original selected ID, including stale dates and resources", () => {
    const original = [
      meeting("selected-a", firstDate),
      meeting("selected-b", firstDate),
    ];
    const selection = [
      original[0],
      meeting("selected-b", secondDate, {
        room: "108",
        instructors: ["other"],
      }),
    ];
    const options = build(original, selection);
    const info = availability<RoomAvailabilityInfo>(options, id);
    expect(info.status).toBe("green");
    expect(info.conflicts).toEqual([]);
    expect(info.checkedDates).toEqual([firstDate, secondDate]);
    expect(options.find((option) => option.value === id)?.hint).toContain(
      "0 занятий по пятницам",
    );
  });

  it("detects selected meetings that overlap after replacing initially different resources", () => {
    const selection = [
      meeting("selected-a", firstDate),
      meeting("selected-b", firstDate, { room: "108", instructors: ["other"] }),
    ];
    const options = build(selection, selection);
    const info = availability<RoomAvailabilityInfo>(options, id);
    expect(info.status).toBe("red");
    expect(info.checkedDates).toEqual([firstDate]);
    expect(info.conflictDates).toEqual([firstDate]);
    expect(options.find((option) => option.value === id)?.hint).toContain(
      "0 занятий по пятницам",
    );
  });

  it("ignores cancelled targets, their original versions, and cancelled external meetings", () => {
    const original = [
      meeting("selected-a", firstDate),
      meeting("selected-b", firstDate),
    ];
    const selection = [
      original[0],
      { ...original[1], date: secondDate, cancelled: true },
    ];
    const options = build(
      [...original, meeting("cancelled", firstDate, { cancelled: true })],
      selection,
    );
    const info = availability<RoomAvailabilityInfo>(options, id);
    expect(info.status).toBe("green");
    expect(info.checkedDates).toEqual([firstDate]);
    expect(info.conflicts).toEqual([]);
    expect(options.find((option) => option.value === id)?.hint).toContain(
      "0 занятий по пятницам",
    );
  });

  it("groups a repeated weekly logical conflict once with precise dates", () => {
    const thirdDate = "2026-09-25";
    const selection = [
      meeting("selected-a", firstDate),
      meeting("selected-b", secondDate),
      meeting("selected-c", thirdDate),
    ];
    const conflicts = [firstDate, secondDate].map((date) =>
      meeting(`1:0:0:wp:0:${date}`, date),
    );
    const info = availability<RoomAvailabilityInfo>(
      build(conflicts, selection),
      id,
    );
    expect(info.conflicts).toHaveLength(1);
    expect(info.conflicts[0]).toMatchObject({
      weekly: true,
      dates: [firstDate, secondDate],
    });
    expect(info.conflictDates).toEqual([firstDate, secondDate]);
    expect(info.checkedDates).toEqual([firstDate, secondDate, thirdDate]);
  });

  it("keeps explicit empty selection authoritative but preserves omitted-selection checks", () => {
    const meetings = [meeting("external", firstDate)];
    const emptyOptions = build(meetings, []);
    const empty = availability<RoomAvailabilityInfo>(emptyOptions, id);
    expect(empty.status).toBe("green");
    expect(empty.checkedDates).toEqual([]);
    expect(empty.conflicts).toEqual([]);
    expect(emptyOptions.find((option) => option.value === id)?.hint).toContain(
      "Нет дат проведения",
    );
    const normal = availability<RoomAvailabilityInfo>(build(meetings), id);
    expect(normal.status).toBe("red");
    expect(normal.checkedDates).toEqual([firstDate]);
    expect(normal.conflictDates).toEqual([firstDate]);
  });
});

describe("bulk resource-specific checks", () => {
  it("uses the worst per-target capacity and keeps ONLINE green", () => {
    const selection = [
      meeting("small", firstDate),
      meeting("large", secondDate, { groups: ["large"] }),
    ];
    const options = roomOptions([], selection);
    expect(availability<RoomAvailabilityInfo>(options, "304")).toMatchObject({
      status: "red",
      capacityIssue: { capacity: 25, needed: 40 },
      checkedDates: [firstDate, secondDate],
    });
    const overlapping = roomOptions(
      [],
      [selection[0], { ...selection[1], date: firstDate }],
    );
    expect(
      availability<RoomAvailabilityInfo>(overlapping, "ONLINE"),
    ).toMatchObject({ status: "green", conflicts: [], capacityIssue: null });
  });

  it("uses a forbidden preference on the second target's actual weekday and time", () => {
    const monday = "2026-09-21";
    const selection = [
      meeting("first", firstDate),
      meeting("second", monday, { start: "09:00", end: "10:30" }),
    ];
    const configuration: SchemaScheduleConfig = {
      ...config,
      instructors: [
        {
          id: "teacher",
          name_en: "Teacher",
          slot_preferences: [
            {
              weekday: Weekday.FRIDAY,
              start_time: "16:00:00",
              level: InstructorSlotPreferenceLevel.preferred,
            },
            {
              weekday: Weekday.MONDAY,
              start_time: "09:00:00",
              level: InstructorSlotPreferenceLevel.banned,
            },
          ],
        },
      ],
    };
    expect(
      availability<InstructorAvailabilityInfo>(
        instructorOptions([], selection, configuration),
        "teacher",
      ),
    ).toMatchObject({
      status: "red",
      checkedDates: [firstDate, monday],
      conflicts: [],
      preference: { level: InstructorSlotPreferenceLevel.banned },
    });
  });

  it("preserves the legacy orange rating for one conflict across multiple unselected dates", () => {
    const common = {
      config,
      meetings: [meeting("external", secondDate)],
      dates: [firstDate, secondDate],
      weekly: true,
      start: "16:00",
      end: "17:30",
    };
    const room = availability<RoomAvailabilityInfo>(
      buildRoomPickerOptions(common),
      "304",
    );
    const instructor = availability<InstructorAvailabilityInfo>(
      buildInstructorPickerOptions({ ...common, weekday: "Fri" }),
      "teacher",
    );
    for (const info of [room, instructor]) {
      expect(info.status).toBe("orange");
      expect(info.checkedDates).toEqual([firstDate, secondDate]);
      expect(info.conflictDates).toEqual([secondDate]);
    }
  });

  it("ignores legacy logical exclusions and slots when selection is supplied", () => {
    const selected = meeting(`0:0:0:wp:0:${firstDate}`, firstDate);
    const sibling = meeting(`0:0:0:wp:0:${secondDate}`, firstDate);
    const common = {
      config,
      meetings: [selected, sibling],
      selection: [selected],
      dates: [],
      slots: [],
      start: "",
      weekly: true,
      excludeRef: {
        kind: "wp" as const,
        courseIdx: 0,
        componentIdx: 0,
        seriesIdx: 0,
        slotIdx: 0,
        date: firstDate,
      },
      excludeInstanceId: sibling.instance_id,
    };
    const room = availability<RoomAvailabilityInfo>(
      buildRoomPickerOptions(common),
      "304",
    );
    const instructor = availability<InstructorAvailabilityInfo>(
      buildInstructorPickerOptions({ ...common, weekday: "Fri" }),
      "teacher",
    );
    for (const info of [room, instructor]) {
      expect(info.status).toBe("red");
      expect(info.conflictDates).toEqual([firstDate]);
    }
  });
});
