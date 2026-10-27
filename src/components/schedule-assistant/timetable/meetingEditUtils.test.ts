import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaCourseConfig,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  applyMeetingEditsToCourse,
  applySeriesScheduleToCourse,
  sessionActiveEqual,
  type MeetingRef,
} from "./meetingEditUtils.ts";
import { buildMeetings } from "./timetableViewerModel.ts";

const first = { start_date: "2026-09-01", end_date: "2026-09-15" };
const second = { start_date: "2026-09-16", end_date: "2026-09-30" };
function configFor(): SchemaScheduleConfig {
  return {
    term: {
      semester: { start_date: first.start_date, end_date: second.end_date },
      starting_day: Weekday.MONDAY,
      days: Object.values(Weekday),
      sections: [],
      time_slots: [],
    },
    students_groups: [{ code: "G" }],
    courses: [
      {
        name: "Math",
        section_code: "core",
        components: [
          {
            tag: "lec",
            audience: ["G"],
            sessions: [first, second].map((active) => ({
              audience: ["G"],
              active,
              weekly_pattern: [
                {
                  weekday: Weekday.TUESDAY,
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                  room: "108",
                  edits: [{ select_week: "2026-10-05", notes: "inactive" }],
                },
              ],
              dates_pattern: [
                {
                  date: "2026-10-06",
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                  notes: "Keep date",
                },
              ],
            })),
          },
        ],
      },
    ],
  } as unknown as SchemaScheduleConfig;
}
const ref: MeetingRef = {
  kind: "wp",
  courseIdx: 0,
  componentIdx: 0,
  seriesIdx: 1,
  slotIdx: 0,
  date: "2026-09-22",
};

describe("exact-series window edits", () => {
  it("changes only the referenced active range, preserves every schedule field and supports explicit null", () => {
    const config = configFor();
    const course = config.courses![0];
    const original = structuredClone(course);
    const updated = applySeriesScheduleToCourse(course, ref, config, {
      active: first,
    })!;
    expect(updated.components[0].sessions![0]).toEqual(
      original.components[0].sessions![0],
    );
    expect(updated.components[0].sessions![1]).toEqual({
      ...original.components[0].sessions![1],
      active: first,
    });
    expect(course).toEqual(original);
    const cleared = applySeriesScheduleToCourse(updated, ref, config, {
      active: null,
    })!;
    expect(cleared.components[0].sessions![1].active).toBeNull();
    expect(sessionActiveEqual(null, undefined)).toBe(true);
    expect(sessionActiveEqual(first, { ...first })).toBe(true);
    expect(sessionActiveEqual(first, second)).toBe(false);
  });

  it("preserves only past weeks inside this series window for future edits", () => {
    const config = configFor();
    const meeting = buildMeetings(config).find(
      (meeting) => meeting.instance_id === "0:0:1:wp:0:2026-09-29",
    )!;
    const updated = applyMeetingEditsToCourse(
      config.courses![0],
      { ...ref, date: "2026-09-29" },
      meeting,
      config,
      "future",
      { room: "304" },
    )!;
    const sessions = updated.components[0].sessions!;
    expect(sessions[0]).toEqual(config.courses![0].components[0].sessions![0]);
    expect(
      sessions[1].weekly_pattern![0].edits?.map((edit) => edit.select_week),
    ).toEqual(["2026-10-05", "2026-09-21"]);
    expect(sessions[1].active).toEqual(second);
    expect(sessions[1].weekly_pattern![0].room).toBe("304");
  });

  it("cancels future dates only inside this series range, never a sibling block", () => {
    const config = configFor();
    const meeting = buildMeetings(config).find(
      (meeting) => meeting.instance_id === "0:0:1:wp:0:2026-09-22",
    )!;
    const updated = applyMeetingEditsToCourse(
      config.courses![0],
      ref,
      meeting,
      config,
      "future",
      { cancel: true },
    ) as SchemaCourseConfig;
    expect(
      updated.components[0]
        .sessions![1].weekly_pattern![0].edits?.filter((edit) => edit.cancel)
        .map((edit) => edit.select_week),
    ).toEqual(["2026-09-21", "2026-09-28"]);
    expect(updated.components[0].sessions![0]).toEqual(
      config.courses![0].components[0].sessions![0],
    );
  });
});
