import { describe, expect, it } from "vitest";
import { applyCreateMeetingToCourse } from "./createMeetingUtils.ts";
import type {
  SchemaScheduleConfig,
  SchemaCourseConfig,
} from "@/api/schedule-assistant/types.ts";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import {
  buildMeetings,
  mergedMeetingsForCell,
  resolveWeeklyMeetingFields,
} from "./timetableViewerModel.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

const config: TimetableViewConfig = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-07", end_date: "2026-09-21" },
    starting_day: Weekday.MONDAY,
    days: [Weekday.MONDAY],
    time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
    sections: [
      {
        code: "core",
        name: "Core",
        programs: [{ code: "P", name: "Program", groups: ["G1"], tracks: [] }],
      },
    ],
  },
  rooms: [],
  instructors: [],
  students_groups: [{ code: "G1" }],
  courses: [],
};
const slot = {
  weekday: Weekday.MONDAY,
  start_time: "09:00:00",
  end_time: "10:30:00",
};

describe("meeting note inheritance", () => {
  it("preserves existing dated notes when creating another event in the series", () => {
    const course: SchemaCourseConfig = {
      name: "Math",
      section_code: "core",
      instructors: [],
      components: [
        {
          tag: "lec",
          audience: ["G1"],
          per_group: false,
          instructor_pool: [],
          sessions: [
            {
              audience: ["G1"],
              notes: "Original series",
              dates_pattern: [
                {
                  date: "2026-09-07",
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                  notes: "Existing override",
                },
              ],
            },
          ],
        },
      ],
    };
    const editableConfig: SchemaScheduleConfig = {
      term: config.term,
      courses: [course],
      students_groups: [{ code: "G1", students: [] }],
      rooms: [],
      instructors: [],
    };
    const saved = applyCreateMeetingToCourse(course, editableConfig, {
      courseIdx: 0,
      componentIdx: 0,
      audience: ["G1"],
      placement: "dates_pattern",
      notes: "Updated series",
      occurrences: [
        {
          date: "2026-09-14",
          start_time: "09:00:00",
          end_time: "10:30:00",
          notes: "",
        },
      ],
    });
    const series = saved?.components[0].sessions?.[0];
    expect(series?.notes).toBe("Updated series");
    expect(series?.dates_pattern?.map((item) => item.notes)).toEqual([
      "Existing override",
      "",
    ]);
    expect(course.components[0].sessions?.[0].notes).toBe("Original series");
  });
  it("inherits, overrides, suppresses and resets weekly notes", () => {
    expect(
      resolveWeeklyMeetingFields(slot, "2026-09-07", config, "Series").notes,
    ).toBe("Series");
    for (const notes of ["Date note", "", null]) {
      const result = resolveWeeklyMeetingFields(
        {
          ...slot,
          edits: [{ select_week: "2026-09-07", cancel: false, notes }],
        },
        "2026-09-07",
        config,
        "Series",
      );
      expect(result.notes).toBe(notes ?? "Series");
    }
  });
  it("keeps date-specific text when an event is moved", () => {
    const result = resolveWeeklyMeetingFields(
      {
        ...slot,
        edits: [
          {
            select_week: "2026-09-07",
            cancel: false,
            date: "2026-09-08",
            notes: "Bring laptop\nRoom changed",
          },
        ],
      },
      "2026-09-07",
      config,
      "Series",
    );
    expect(result.date).toBe("2026-09-08");
    expect(result.notes).toBe("Bring laptop\nRoom changed");
  });
  it("builds notes for concrete dates and weekly events without losing explicit blanks", () => {
    const meetings = buildMeetings({
      ...config,
      courses: [
        {
          name: "Math",
          section_code: "core",
          instructors: [],
          components: [
            {
              tag: "lec",
              audience: ["G1"],
              per_group: false,
              sessions: [
                {
                  audience: ["G1"],
                  notes: "Series",
                  weekly_pattern: [
                    {
                      ...slot,
                      edits: [
                        { select_week: "2026-09-14", cancel: false, notes: "" },
                      ],
                    },
                  ],
                  dates_pattern: [
                    {
                      date: "2026-09-08",
                      start_time: "09:00:00",
                      end_time: "10:30:00",
                      notes: null,
                    },
                    {
                      date: "2026-09-09",
                      start_time: "09:00:00",
                      end_time: "10:30:00",
                      notes: "<script>text only</script>",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const first = meetings[0];
    expect(
      mergedMeetingsForCell([first, { ...first, notes: "Different note" }]),
    ).toHaveLength(2);
    expect(
      meetings.find((meeting) => meeting.date === "2026-09-08")?.notes,
    ).toBe("Series");
    expect(
      meetings.find((meeting) => meeting.date === "2026-09-09")?.notes,
    ).toBe("<script>text only</script>");
    expect(
      meetings.find((meeting) => meeting.date === "2026-09-07")?.notes,
    ).toBe("Series");
    expect(
      meetings.find((meeting) => meeting.date === "2026-09-14")?.notes,
    ).toBe("");
  });
});
