import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaDateRange,
  type SchemaPublicTimetable,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { countCourseLessonsByInstructor } from "@/components/schedule-assistant/settings/courses/courseInstructorLessonCounts.ts";
import {
  applyEditableEventsToCourse,
  eventsToOccurrences,
  expandOccurrencesToEvents,
  expandWeeklySlotsToEvents,
  serializeOccurrenceEvents,
  serializeWeeklyEventsToSlots,
  validateEditableEvents,
} from "./editableSessionEvents.ts";
import { instructorAvailabilityForSlot } from "./instructorPickerOptions.ts";
import { countComponentPlacement } from "./meetingComponentContext.ts";
import { weeklyPickerSlots } from "./meetingPickerSchedule.ts";
import { publicTimetableConfig } from "./publicTimetableConfig.ts";
import {
  roomAvailabilityForSlot,
  roomPickerDatesForEdit,
} from "./roomPickerOptions.ts";
import { matchSessionBlock, resolveSessionWindow } from "./sessionWindows.ts";
import {
  activeWeeklySlotDates,
  buildMeetings,
  countWeeklyPatternSlotOccurrences,
} from "./timetableViewerModel.ts";

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
      blocks: [
        { id: "first", name: "First block", ...first },
        { id: "second", name: "Second block", ...second },
      ],
      sections: [
        {
          code: "core",
          name: "Core",
          programs: [
            {
              code: "P1",
              name: "P1",
              semester: { start_date: "2026-08-25", end_date: "2026-10-06" },
              groups: ["G1"],
              tracks: [],
            },
            {
              code: "P2",
              name: "P2",
              semester: { start_date: "2026-09-08", end_date: "2026-09-22" },
              groups: ["G2"],
              tracks: [],
            },
          ],
        },
      ],
    },
    students_groups: [
      { code: "G1", students: [] },
      { code: "G2", students: [] },
    ],
    courses: [
      {
        name: "Math",
        section_code: "core",
        components: [
          {
            tag: "lec",
            audience: ["G1"],
            instructor_pool: [],
            per_group: false,
            sessions: [
              {
                audience: ["G1"],
                active: first,
                weekly_pattern: [slot],
              },
              {
                audience: ["G1"],
                active: second,
                weekly_pattern: [slot],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("session windows", () => {
  it("preserves the audience program window beyond both term boundaries for null active", () => {
    const config = configFor();
    expect(resolveSessionWindow(config, ["G1"], null)).toEqual({
      start_date: "2026-08-25",
      end_date: "2026-10-06",
    });
    expect(resolveSessionWindow(config, ["@P1"])).toEqual(
      resolveSessionWindow(config, ["G1"], null),
    );
    expect(resolveSessionWindow(config, [], null)).toEqual(
      config.term.semester,
    );
    expect(resolveSessionWindow(config, ["unknown"], null)).toEqual(
      config.term.semester,
    );
    expect(activeWeeklySlotDates(config, slot, ["G1"], null)).toEqual([
      "2026-08-25",
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
      "2026-09-29",
      "2026-10-06",
    ]);
  });

  it("intersects explicit ranges with all audience programs inclusively", () => {
    const config = configFor();
    expect(resolveSessionWindow(config, ["G1", "G2"], first)).toEqual({
      start_date: "2026-09-08",
      end_date: "2026-09-15",
    });
    expect(activeWeeklySlotDates(config, slot, ["G1", "G2"], first)).toEqual([
      "2026-09-08",
      "2026-09-15",
    ]);
    const boundary = { start_date: "2026-09-22", end_date: "2026-10-20" };
    expect(resolveSessionWindow(config, ["G2"], boundary)).toEqual({
      start_date: "2026-09-22",
      end_date: "2026-09-22",
    });
    expect(activeWeeklySlotDates(config, slot, ["G2"], boundary)).toEqual([
      "2026-09-22",
    ]);
    expect(
      resolveSessionWindow(config, ["G1"], {
        start_date: "2026-10-01",
        end_date: "2026-10-06",
      }),
    ).toEqual({ start_date: "2026-10-01", end_date: "2026-10-06" });
  });

  it("returns no dates, editor events, counts or picker targets for empty intersections", () => {
    const config = configFor();
    const active = { start_date: "2026-10-01", end_date: "2026-10-06" };
    expect(resolveSessionWindow(config, ["G2"], active)).toBeNull();
    expect(activeWeeklySlotDates(config, slot, ["G2"], active)).toEqual([]);
    expect(
      countWeeklyPatternSlotOccurrences(config, slot, ["G2"], active),
    ).toBe(0);
    expect(weeklyPickerSlots(config, slot, ["G2"], "room", active)).toEqual([]);
    expect(
      roomPickerDatesForEdit({
        config,
        weekday: "Tue",
        audienceTokens: ["G2"],
        active,
      }),
    ).toEqual([]);
    expect(
      expandWeeklySlotsToEvents({
        config,
        weeklySlots: [slot],
        audienceTokens: ["G2"],
        active,
      }),
    ).toEqual([]);
    expect(
      resolveSessionWindow(config, [], {
        start_date: "2026-09-20",
        end_date: "2026-09-10",
      }),
    ).toBeNull();
    config.term.sections![0].programs![1].semester = {
      start_date: "2026-10-07",
      end_date: "2026-10-20",
    };
    expect(resolveSessionWindow(config, ["G1", "G2"], null)).toBeNull();
  });

  it("resolves block references live without rewriting series or inferring a block from custom dates", () => {
    const config = configFor();
    const series = {
      audience: ["G1"],
      active: null,
      block_id: "first",
      weekly_pattern: [slot],
    };
    config.courses![0].components[0].sessions = [series];
    expect(matchSessionBlock(config, "first")?.id).toBe("first");
    expect(matchSessionBlock(config, "second")?.id).toBe("second");
    expect(matchSessionBlock(config, null)).toBeNull();
    expect(resolveSessionWindow(config, ["G1"], null, "missing")).toBeNull();
    expect(resolveSessionWindow(config, ["G1"], null, "first")).toEqual(first);
    expect(buildMeetings(config).map((meeting) => meeting.date)).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ]);
    config.term.blocks![0].end_date = "2026-09-08";
    expect(resolveSessionWindow(config, ["G1"], null, "first")?.end_date).toBe(
      "2026-09-08",
    );
    expect(buildMeetings(config).map((meeting) => meeting.date)).toEqual([
      "2026-09-01",
      "2026-09-08",
    ]);
    expect(series).toEqual({
      audience: ["G1"],
      active: null,
      block_id: "first",
      weekly_pattern: [slot],
    });
    expect(resolveSessionWindow(config, ["G1"], first)).toEqual(first);
  });

  it("does not reset alternation at a block boundary", () => {
    const config = configFor();
    const alternating = { ...slot, alternation: { anchor_week: "2026-08-31" } };
    expect(
      activeWeeklySlotDates(config, alternating, ["G1"], {
        start_date: "2026-09-08",
        end_date: "2026-09-29",
      }),
    ).toEqual(["2026-09-15", "2026-09-29"]);
    expect(
      countWeeklyPatternSlotOccurrences(config, alternating, ["G1"], second),
    ).toBe(1);
  });
});

describe("session window consumers", () => {
  it("keeps same-audience split windows separate across viewer, editor, pickers and counts", () => {
    const config = configFor();
    const sessions = config.courses![0].components[0].sessions!;
    const datesBySession = [
      ["2026-09-01", "2026-09-08", "2026-09-15"],
      ["2026-09-22", "2026-09-29"],
    ];
    for (const [index, series] of sessions.entries()) {
      const dates = datesBySession[index];
      expect(
        expandWeeklySlotsToEvents({
          config,
          weeklySlots: [slot],
          audienceTokens: series.audience,
          active: series.active,
        }).map((event) => event.date),
      ).toEqual(dates);
      for (const resource of ["room", "instructor"] as const) {
        const slots = weeklyPickerSlots(
          config,
          slot,
          series.audience,
          resource,
          series.active,
        );
        expect(slots.map((item) => item.date)).toEqual(dates);
        const meetings = buildMeetings(config);
        const room = roomAvailabilityForSlot({
          config,
          meetings,
          roomId: "108",
          dates: [],
          slots,
          start: "09:00",
          audienceSize: null,
          capacity: null,
        });
        const instructor = instructorAvailabilityForSlot({
          config,
          meetings,
          instructorId: "teacher",
          dates: [],
          slots,
          start: "09:00",
          weekday: Weekday.TUESDAY,
        });
        expect(room.checkedDates).toEqual(dates);
        expect(instructor.checkedDates).toEqual(dates);
        expect(room.conflictDates).toEqual(dates);
        expect(instructor.conflictDates).toEqual(dates);
      }
      expect(
        countWeeklyPatternSlotOccurrences(
          config,
          slot,
          series.audience,
          series.active,
        ),
      ).toBe(dates!.length);
    }
    const meetings = buildMeetings(config);
    expect(meetings.map((meeting) => meeting.date)).toEqual(
      datesBySession.flat(),
    );
    expect(
      countCourseLessonsByInstructor(config.courses![0], config)
        .get("teacher")
        ?.get("lec"),
    ).toBe(5);
  });

  it("counts detail-panel occurrences within each series window rather than the whole semester twice", () => {
    const config = configFor();
    expect(
      countComponentPlacement(config, config.courses![0].components[0]),
    ).toEqual({
      weeklySlots: 2,
      weeklyOccurrences: 5,
      occurrences: 0,
      seriesCount: 2,
    });
  });

  it("retains concrete dates and moved overrides outside active for validation instead of dropping them", () => {
    const config = configFor();
    const series = config.courses![0].components[0].sessions![0];
    config.courses![0].components[0].sessions = [series];
    series.weekly_pattern = [
      {
        ...slot,
        edits: [
          { select_week: "2026-08-31", date: "2026-10-20", cancel: false },
          { select_week: "2026-09-07", cancel: true },
          {
            select_week: "2026-09-14",
            room: "999",
            instructor: "substitute",
            cancel: false,
          },
        ],
      },
    ];
    series.dates_pattern = [
      {
        date: "2026-11-03",
        start_time: "09:00:00",
        end_time: "10:30:00",
        instructor: "teacher",
      },
    ];
    const weeklySlot = series.weekly_pattern[0];
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [weeklySlot],
      audienceTokens: ["G1"],
      active: first,
    });
    expect(eventsToOccurrences(events).map((event) => event.date)).toEqual([
      "2026-09-15",
      "2026-10-20",
    ]);
    expect(buildMeetings(config).map((meeting) => meeting.date)).toEqual([
      "2026-11-03",
      "2026-10-20",
      "2026-09-08",
      "2026-09-15",
    ]);
    expect(
      weeklyPickerSlots(config, weeklySlot, ["G1"], "room", first),
    ).toEqual([{ date: "2026-10-20", start: "09:00", end: "10:30" }]);
    expect(
      countWeeklyPatternSlotOccurrences(config, weeklySlot, ["G1"], first),
    ).toBe(2);
    const counts = countCourseLessonsByInstructor(config.courses![0], config);
    expect(counts.get("teacher")?.get("lec")).toBe(2);
    expect(counts.get("substitute")?.get("lec")).toBe(1);
    expect(
      serializeWeeklyEventsToSlots({
        originalSlots: [weeklySlot],
        events,
        config,
      })[0].edits,
    ).toHaveLength(3);
  });

  it("validates concrete and moved dates against the effective window without deleting them", () => {
    const config = configFor();
    const occurrences = [
      { date: "2026-09-15", start_time: "09:00:00", end_time: "10:30:00" },
      { date: "2026-10-20", start_time: "09:00:00", end_time: "10:30:00" },
    ];
    const events = expandOccurrencesToEvents(occurrences);
    const window = resolveSessionWindow(config, ["G1"], first);
    expect(validateEditableEvents(events, window)).toContain("2026-10-20");
    expect(
      serializeOccurrenceEvents(events).map((event) => event.date),
    ).toEqual(occurrences.map((event) => event.date));
    expect(validateEditableEvents([events[0]], window)).toBeNull();
    expect(validateEditableEvents(events)).toBeNull();
    expect(validateEditableEvents(events, null)).not.toBeNull();
    expect(
      validateEditableEvents(
        events.map((event, index) => ({ ...event, cancelled: index === 1 })),
        window,
      ),
    ).toBeNull();
    const movedEvents = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [
        {
          ...slot,
          edits: [
            { select_week: "2026-08-31", date: "2026-10-20", cancel: false },
          ],
        },
      ],
      audienceTokens: ["G1"],
      active: first,
    });
    expect(validateEditableEvents(movedEvents, window)).toContain("2026-10-20");
  });

  it("keeps edits outside a narrowed expansion window unchanged", () => {
    const config = configFor();
    const originalSlot = {
      ...slot,
      edits: [
        { select_week: "2026-08-31", date: "2026-11-03", cancel: false },
        { select_week: "2026-09-21", room: "999", cancel: false },
      ],
    };
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [originalSlot],
      audienceTokens: ["G1"],
      active: second,
    });
    expect(events.map((event) => event.date)).toEqual([
      "2026-09-22",
      "2026-09-29",
    ]);
    const savedEdits = serializeWeeklyEventsToSlots({
      originalSlots: [originalSlot],
      events,
      config,
    })[0].edits;
    expect(savedEdits).toHaveLength(2);
    expect(savedEdits![0]).toEqual(originalSlot.edits[0]);
    expect(savedEdits![1]).toMatchObject(originalSlot.edits[1]);
  });

  it("saves active changes without overwriting same-audience sibling series", () => {
    const config = configFor();
    const course = config.courses![0];
    const sibling = structuredClone(course.components[0].sessions![1]);
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [slot],
      audienceTokens: ["G1"],
      active: second,
    });
    const saved = applyEditableEventsToCourse({
      config,
      course,
      meetingRef: {
        kind: "wp",
        courseIdx: 0,
        componentIdx: 0,
        seriesIdx: 0,
        slotIdx: 0,
        date: "2026-09-01",
      },
      active: second,
      placement: "weekly",
      weeklySlots: [slot],
      events,
    });
    expect(saved!.components[0].sessions![0].active).toEqual(second);
    expect(saved!.components[0].sessions![1]).toEqual(sibling);
    expect(course.components[0].sessions![0].active).toEqual(first);
  });

  it("retains public block metadata and active ranges in read-only expansion", () => {
    const config = configFor();
    const data: SchemaPublicTimetable = {
      term: {
        name: "Fall",
        semester: config.term.semester,
        days: config.term.days,
        starting_day: Weekday.MONDAY,
        time_slots: config.term.time_slots,
        blocks: config.term.blocks,
      },
      courses: [
        {
          name: "Math",
          section_code: "core",
          notes: "Course notes",
          components: [
            {
              tag: "lec",
              sessions: [
                {
                  active: null,
                  block_id: "first",
                  weekly_pattern: [slot],
                },
                {
                  active: null,
                  block_id: "second",
                  weekly_pattern: [slot],
                },
              ],
            },
          ],
        },
      ],
    };
    const view = publicTimetableConfig(data);
    expect(view.term.blocks).toEqual(config.term.blocks);
    expect(view.courses![0].components[0].sessions![1].block_id).toEqual(
      "second",
    );
    expect(
      buildMeetings(view).map((meeting) => [meeting.date, meeting.notes]),
    ).toEqual([
      ["2026-09-01", "Course notes"],
      ["2026-09-08", "Course notes"],
      ["2026-09-15", "Course notes"],
      ["2026-09-22", "Course notes"],
      ["2026-09-29", "Course notes"],
    ]);
    data.term.blocks = [];
    expect(matchSessionBlock(publicTimetableConfig(data), "first")).toBeNull();
    delete data.term.blocks;
    data.courses![0].components[0].sessions![0].block_id = null;
    const fullTermView = publicTimetableConfig(data);
    expect(fullTermView.term.blocks).toEqual([]);
    expect(
      buildMeetings(fullTermView)
        .filter((meeting) => meeting.notes === "Course notes")
        .map((meeting) => meeting.date),
    ).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
      "2026-09-29",
    ]);
  });
});
