import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaComponent,
  type SchemaCourseConfig,
  type SchemaDateRange,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import {
  applyCreateMeetingToCourse,
  componentProgressHint,
  componentScheduleStatus,
  courseComponentOptions,
  defaultCreatePlacement,
  findMatchingSessionSeries,
  previewCreateSeriesAction,
} from "./createMeetingUtils.ts";
import { draftMeetingsFromWeeklySlots } from "./sessionSeriesRows.tsx";

const first: SchemaDateRange = {
  start_date: "2026-09-01",
  end_date: "2026-09-15",
};
const second: SchemaDateRange = {
  start_date: "2026-09-16",
  end_date: "2026-09-30",
};
const slot: SchemaWeeklyPatternSlot = {
  weekday: Weekday.TUESDAY,
  start_time: "09:00:00",
  end_time: "10:30:00",
};
const config = {
  term: {
    semester: { start_date: first.start_date, end_date: second.end_date },
    starting_day: Weekday.MONDAY,
    days: Object.values(Weekday),
    time_slots: [],
    sections: [],
  },
  students_groups: [{ code: "G" }],
} as unknown as SchemaScheduleConfig;
function componentFor(): SchemaComponent {
  return {
    tag: "lec",
    audience: ["G"],
    per_group: false,
    per_week: 1,
    instructor_pool: [],
    sessions: [
      {
        audience: ["G"],
        notes: "first",
        active: first,
        weekly_pattern: [slot],
      },
      {
        audience: ["G"],
        notes: "second",
        active: second,
        dates_pattern: [
          { date: "2026-09-22", start_time: "09:00:00", end_time: "10:30:00" },
        ],
      },
    ],
  };
}

describe("window-aware create matching", () => {
  it("matches exact stored ranges, including null, rather than equal audiences alone", () => {
    const component = componentFor();
    expect(
      findMatchingSessionSeries(component, ["G"], config, "core", {
        ...second,
      }),
    ).toBe(component.sessions![1]);
    expect(
      findMatchingSessionSeries(component, ["G"], config, "core", null),
    ).toBeNull();
    expect(
      previewCreateSeriesAction(component, ["G"], config, "core", second),
    ).toBe("append");
    expect(
      previewCreateSeriesAction(component, ["G"], config, "core", null),
    ).toBe("create");
    const course = {
      name: "Math",
      section_code: "core",
      components: [component],
    } as SchemaCourseConfig;
    expect(
      defaultCreatePlacement(course, 0, ["G"], config, "groups", second),
    ).toBe("dates_pattern");
    expect(
      defaultCreatePlacement(course, 0, ["G"], config, "calendar", first),
    ).toBe("weekly");
  });

  it("appends only to the matching block and preserves sibling windows and source data", () => {
    const course = {
      name: "Math",
      section_code: "core",
      components: [componentFor()],
    } as SchemaCourseConfig;
    const original = structuredClone(course);
    const updated = applyCreateMeetingToCourse(course, config, {
      courseIdx: 0,
      componentIdx: 0,
      audience: ["G"],
      active: second,
      placement: "dates_pattern",
      occurrences: [
        { date: "2026-09-29", start_time: "11:00", end_time: "12:30" },
      ],
    })!;
    expect(updated.components[0].sessions).toHaveLength(2);
    expect(updated.components[0].sessions![0]).toEqual(
      original.components[0].sessions![0],
    );
    expect(updated.components[0].sessions![1].dates_pattern).toHaveLength(2);
    expect(updated.components[0].sessions![1].active).toEqual(second);
    expect(course).toEqual(original);
    const unrestricted = applyCreateMeetingToCourse(updated, config, {
      courseIdx: 0,
      componentIdx: 0,
      audience: ["G"],
      active: null,
      placement: "weekly",
      weeklySlots: [slot],
    })!;
    expect(unrestricted.components[0].sessions).toHaveLength(3);
    expect(unrestricted.components[0].sessions![2].active).toBeNull();
  });

  it("uses the same selected window in component option status and append preview", () => {
    const component = componentFor();
    component.sessions = [component.sessions![0]];
    const course = {
      name: "Math",
      section_code: "core",
      components: [component],
    } as SchemaCourseConfig;
    expect(
      courseComponentOptions([course], config, undefined, second)[0],
    ).toMatchObject({ status: "empty", seriesAction: "create" });
    expect(
      courseComponentOptions([course], config, undefined, first)[0],
    ).toMatchObject({ status: "covered", seriesAction: "append" });
  });
});

describe("weekly progress on relevant dates", () => {
  it("does not add quotas across disjoint blocks and detects incomplete weeks", () => {
    const component = componentFor();
    component.sessions![1].dates_pattern = null;
    component.sessions![1].weekly_pattern = [slot];
    expect(componentScheduleStatus(component, config, "core")).toBe("covered");
    expect(componentProgressHint(component, config, "core")).toBe("1/1");
    component.per_week = 2;
    expect(componentScheduleStatus(component, config, "core")).toBe("partial");
    expect(componentProgressHint(component, config, "core")).toBe("1/2");
    component.sessions = [component.sessions![0]];
    expect(
      componentScheduleStatus(component, config, "core", undefined, second),
    ).toBe("empty");
    expect(
      componentProgressHint(component, config, "core", undefined, second),
    ).toBe("0/2");
    expect(componentScheduleStatus(component, config, "core")).toBe("partial");
  });

  it("counts concurrent templates independently of alternation and cancellations, but semester totals use actual dates", () => {
    const component = componentFor();
    component.sessions = [
      {
        audience: ["G"],
        notes: "",
        active: null,
        weekly_pattern: [
          { ...slot, alternation: { anchor_week: "2026-08-31" } },
        ],
      },
    ];
    expect(componentScheduleStatus(component, config, "core")).toBe("covered");
    expect(componentProgressHint(component, config, "core")).toBe("1/1");
    component.sessions[0].weekly_pattern = [
      { ...slot, edits: [{ select_week: "2026-09-07", cancel: true }] },
    ];
    expect(componentScheduleStatus(component, config, "core")).toBe("covered");
    component.sessions[0].dates_pattern = [
      { date: "2026-09-08", start_time: "09:00:00", end_time: "10:30:00" },
    ];
    expect(componentScheduleStatus(component, config, "core")).toBe("covered");
    component.per_week = null;
    component.per_semester = 6;
    for (const active of [first, second, null]) {
      expect(
        componentProgressHint(component, config, "core", undefined, active),
      ).toBe("5/6");
      expect(
        componentScheduleStatus(component, config, "core", undefined, active),
      ).toBe("partial");
    }
  });

  it("limits peer draft resource conflicts to the current window and ignores locked siblings", () => {
    const drafts = draftMeetingsFromWeeklySlots(
      config,
      [slot, slot, slot],
      ["G"],
      1,
      new Set(),
      1,
      second,
    );
    expect(drafts.map((meeting) => meeting.date)).toEqual([
      "2026-09-22",
      "2026-09-29",
    ]);
    expect(
      drafts.every((meeting) => meeting.instance_id.startsWith("draft:wp:2:")),
    ).toBe(true);
  });
});
