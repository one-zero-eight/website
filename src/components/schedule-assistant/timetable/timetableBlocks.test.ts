import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaComponent,
  type SchemaDateRange,
  type SchemaScheduleConfig,
  type SchemaTermBlock,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { activeForBlock } from "./sessionWindows.ts";
import {
  blockForWeekBoundary,
  buildTeachingWeeks,
  courseMatchesBlock,
  rangesEqual,
} from "./timetableBlocks.ts";
import { buildMeetings, buildWeeks } from "./timetableViewerModel.ts";
import { buildCalendarGrid } from "./timetableCalendarModel.ts";
import {
  buildUnarrangedComponentGroups,
  buildUnarrangedLessons,
} from "./unarrangedLessons.ts";

const first: SchemaDateRange = {
  start_date: "2026-09-01",
  end_date: "2026-09-15",
};
const second: SchemaDateRange = {
  start_date: "2026-09-16",
  end_date: "2026-09-30",
};
const blocks: SchemaTermBlock[] = [
  { id: "first", name: "First block", ...first },
  { id: "second", name: "Second block", ...second },
];
const slot: SchemaWeeklyPatternSlot = {
  weekday: Weekday.TUESDAY,
  start_time: "09:00:00",
  end_time: "10:30:00",
  room: "108",
  instructor: "teacher",
};

function configFor(): SchemaScheduleConfig {
  return {
    term: {
      name: "Fall",
      semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
      starting_day: Weekday.MONDAY,
      days: Object.values(Weekday),
      time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
      blocks,
      sections: [
        {
          code: "core",
          name: "Core",
          programs: [
            {
              code: "P1",
              name: "Program 1",
              semester: { start_date: "2026-08-25", end_date: "2026-10-06" },
              groups: ["G1"],
            },
            {
              code: "P2",
              name: "Program 2",
              semester: { start_date: "2026-09-08", end_date: "2026-09-22" },
              groups: ["G2"],
            },
          ],
        },
      ],
    },
    students_groups: [
      { code: "G1", name: "Group 1", estimated_size: 10 },
      { code: "G2", name: "Group 2", estimated_size: 10 },
    ],
    rooms: [],
    instructors: [],
    courses: [
      { name: "Other section", section_code: "other", components: [] },
      {
        name: "Math",
        section_code: "core",
        components: [
          {
            tag: "lec",
            audience: ["G1"],
            per_week: 1,
            sessions: [
              { audience: ["G1"], active: first, weekly_pattern: [slot] },
              { audience: ["G1"], active: second, weekly_pattern: [slot] },
            ],
          },
          {
            tag: "lab",
            audience: ["G1"],
            per_week: 1,
            sessions: [
              { audience: ["G1"], active: first, weekly_pattern: [slot] },
            ],
          },
          {
            tag: "tut",
            audience: ["G1"],
            per_week: 2,
            sessions: [
              { audience: ["G1"], active: first, weekly_pattern: [slot] },
              { audience: ["G1"], active: second, weekly_pattern: [slot] },
            ],
          },
        ],
      },
    ],
  } as unknown as SchemaScheduleConfig;
}

function groupsFor(
  config: SchemaScheduleConfig,
  active?: SchemaDateRange | null,
) {
  return buildUnarrangedComponentGroups(
    config.courses ?? [],
    config,
    { sectionCode: "core" },
    {},
    active,
  );
}

function setComponent(
  config: SchemaScheduleConfig,
  component: SchemaComponent,
) {
  config.courses![1].components = [component];
}

describe("timetable block helpers", () => {
  it("includes empty weeks throughout term and program windows", () => {
    const config = configFor();
    const weeks = buildTeachingWeeks(config, []);
    expect(weeks.map((week) => week.start)).toEqual([
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ]);
    expect(weeks[0]).toEqual({
      key: "2026-08-24",
      start: "2026-08-24",
      end: "2026-08-30",
    });
    expect(weeks.at(-1)?.end).toBe("2026-10-11");
  });

  it("builds an empty calendar for teaching weeks before any lessons are placed", () => {
    const config = configFor();
    config.courses = [];
    const weeks = buildTeachingWeeks(config, []);
    const calendar = buildCalendarGrid(config, [], weeks, "core");
    expect(calendar?.weeks.map((week) => week.key)).toEqual(
      weeks.map((week) => week.key),
    );
    expect(calendar?.cells.size).toBe(0);
    expect(calendar?.slots).toHaveLength(1);
  });

  it("retains and deduplicates placed weeks, including dates outside teaching windows", () => {
    const config = configFor();
    const meeting = buildMeetings(config)[0]!;
    const meetings = [meeting, { ...meeting, date: "2026-10-20" }];
    const weeks = buildTeachingWeeks(config, meetings);
    expect(weeks.filter((week) => week.key === "2026-08-31")).toHaveLength(1);
    expect(weeks.at(-1)?.start).toBe("2026-10-19");
    expect(weeks.map((week) => week.start)).toEqual(
      weeks.map((week) => week.start).toSorted(),
    );
  });

  it("keeps meeting-derived weeks when blocks are absent", () => {
    const config = configFor();
    config.term.blocks = [];
    const meetings = buildMeetings(config);
    expect(buildTeachingWeeks(config, meetings)).toEqual(buildWeeks(meetings));
    expect(buildTeachingWeeks(config, [])).toEqual([]);
  });

  it("finds only blocks starting inside the week, including both boundaries", () => {
    const week = {
      key: "2026-09-14",
      start: "2026-09-14",
      end: "2026-09-20",
    };
    const monday = { ...blocks[0], start_date: week.start };
    const sunday = { ...blocks[1], start_date: week.end };
    expect(blockForWeekBoundary(blocks, week)).toEqual([blocks[1]]);
    expect(blockForWeekBoundary([monday, sunday], week)).toEqual([
      monday,
      sunday,
    ]);
    expect(blockForWeekBoundary([], week)).toEqual([]);
  });

  it("matches unrestricted courses and explicit block memberships", () => {
    for (const course of [
      { components: [] },
      { components: [{ sessions: [{ active: null }] }] },
    ]) {
      expect(courseMatchesBlock(course, "first")).toBe(true);
    }
    const course = {
      components: [
        {
          sessions: [
            {
              active: activeForBlock("first"),
            },
          ],
        },
      ],
    };
    expect(courseMatchesBlock(course, "first")).toBe(true);
    expect(courseMatchesBlock(course, "second")).toBe(false);
    expect(courseMatchesBlock(course, "all")).toBe(true);
  });

  it("compares range dates rather than references and treats null as unset", () => {
    expect(rangesEqual(first, { ...first })).toBe(true);
    expect(rangesEqual(first, second)).toBe(false);
    expect(rangesEqual(first, { ...first, end_date: second.end_date })).toBe(
      false,
    );
    expect(rangesEqual(first, null)).toBe(false);
    expect(rangesEqual(undefined, first)).toBe(false);
    expect(rangesEqual(null, undefined)).toBe(true);
    expect(rangesEqual(undefined, undefined)).toBe(true);
  });
});

describe("block-specific unarranged lessons", () => {
  it("does not let block one coverage hide an unplaced block two component", () => {
    const config = configFor();
    expect(groupsFor(config, first).map((group) => group.componentIdx)).toEqual(
      [2],
    );
    const groups = groupsFor(config, second);
    expect(groups.map((group) => group.componentIdx)).toEqual([1, 2]);
    expect(groups.map((group) => group.componentStatus)).toEqual([
      "empty",
      "partial",
    ]);
    expect(groups.map((group) => group.sessions[0].progressHint)).toEqual([
      "0/1",
      "1/2",
    ]);
    expect(groups.map((group) => group.key)).toEqual(["1:1", "1:2"]);
    expect(groups.every((group) => group.courseIdx === 1)).toBe(true);
    expect(groups.map((group) => group.sessions[0].componentIdx)).toEqual([
      1, 2,
    ]);
  });

  it("forwards the selected window through the flattened lessons helper", () => {
    const config = configFor();
    expect(
      buildUnarrangedLessons(
        config.courses!,
        config,
        { sectionCode: "core" },
        second,
      ).map((item) => [item.componentIdx, item.status, item.progressHint]),
    ).toEqual([
      [1, "empty", "0/1"],
      [2, "partial", "1/2"],
    ]);
  });

  it("evaluates each per-group bucket in the selected window", () => {
    const config = configFor();
    setComponent(config, {
      ...config.courses![1].components[1],
      per_group: true,
      audience: ["G1", "G2"],
      sessions: [
        { audience: ["G1"], active: first, weekly_pattern: [slot] },
        { audience: ["G2"], active: second, weekly_pattern: [slot] },
      ],
    });
    for (const [active, missingGroup] of [
      [first, "G2"],
      [second, "G1"],
    ] as const) {
      const groups = groupsFor(config, active);
      expect(groups).toHaveLength(1);
      expect(groups[0].componentStatus).toBe("partial");
      expect(groups[0].sessions).toHaveLength(1);
      expect(groups[0].sessions[0]).toMatchObject({
        groupIds: [missingGroup],
        status: "empty",
        progressHint: "0/1",
      });
    }
  });

  it("keeps semester targets and occurrence counts global across split windows", () => {
    const config = configFor();
    setComponent(config, {
      ...config.courses![1].components[0],
      per_week: null,
      per_semester: 6,
    });
    for (const active of [first, second, null]) {
      const groups = groupsFor(config, active);
      expect(groups).toHaveLength(1);
      expect(groups[0].componentStatus).toBe("partial");
      expect(groups[0].sessions[0].progressHint).toBe("5/6");
    }
    config.courses![1].components[0].per_semester = 5;
    expect(groupsFor(config, first)).toEqual([]);
    expect(groupsFor(config, second)).toEqual([]);
  });
});
