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

describe("course notes", () => {
  it("updates course notes when creating another event in the course", () => {
    const course: SchemaCourseConfig = {
      name: "Math",
      section_code: "core",
      notes: "Original course",
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
              dates_pattern: [
                {
                  date: "2026-09-07",
                  start_time: "09:00:00",
                  end_time: "10:30:00",
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
      notes: "Updated course",
      occurrences: [
        {
          date: "2026-09-14",
          start_time: "09:00:00",
          end_time: "10:30:00",
        },
      ],
    });
    const series = saved?.components[0].sessions?.[0];
    expect(saved?.notes).toBe("Updated course");
    expect(series?.dates_pattern?.map((item) => item.date)).toEqual([
      "2026-09-07",
      "2026-09-14",
    ]);
    expect(course.notes).toBe("Original course");
  });
  it("shows course notes on weekly meetings, including moved and cancelled ones", () => {
    for (const edit of [
      null,
      { select_week: "2026-09-07", cancel: false, date: "2026-09-08" },
      { select_week: "2026-09-07", cancel: true },
    ]) {
      const result = resolveWeeklyMeetingFields(
        { ...slot, edits: edit ? [edit] : null },
        "2026-09-07",
        config,
        "Bring laptop\nRoom changed",
      );
      expect(result.notes).toBe("Bring laptop\nRoom changed");
    }
  });
  it("builds every concrete and weekly meeting with the course notes", () => {
    const meetings = buildMeetings({
      ...config,
      courses: [
        {
          name: "Math",
          section_code: "core",
          notes: "<script>text only</script>",
          instructors: [],
          components: [
            {
              tag: "lec",
              audience: ["G1"],
              per_group: false,
              sessions: [
                {
                  audience: ["G1"],
                  weekly_pattern: [
                    {
                      ...slot,
                      edits: [
                        {
                          select_week: "2026-09-14",
                          cancel: false,
                          room: "104",
                        },
                      ],
                    },
                  ],
                  dates_pattern: [
                    {
                      date: "2026-09-09",
                      start_time: "09:00:00",
                      end_time: "10:30:00",
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
      meetings.map((meeting) => [meeting.date, meeting.notes]).sort(),
    ).toEqual([
      ["2026-09-07", "<script>text only</script>"],
      ["2026-09-09", "<script>text only</script>"],
      ["2026-09-14", "<script>text only</script>"],
      ["2026-09-21", "<script>text only</script>"],
    ]);
  });
});
