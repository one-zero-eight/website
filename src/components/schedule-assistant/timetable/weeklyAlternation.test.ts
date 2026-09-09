import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import {
  activeWeeklySlotDates,
  buildMeetings,
  countWeeklyPatternSlotOccurrences,
  inactiveWeeklySlotEdits,
  isWeeklySlotActiveOnDate,
} from "./timetableViewerModel.ts";
import {
  eventSchedulesEqual,
  eventsToOccurrences,
  eventsToWeeklySlots,
  expandOccurrencesToEvents,
  expandWeeklySlotsToEvents,
  serializeWeeklyEventsToSlots,
} from "./editableSessionEvents.ts";
import {
  applyMeetingEditsToCourse,
  applySeriesScheduleToCourse,
  type MeetingRef,
} from "./meetingEditUtils.ts";
import { applyCreateMeetingToCourse } from "./createMeetingUtils.ts";
import { weeklyPickerSlots } from "./meetingPickerSchedule.ts";
import { draftMeetingsFromWeeklySlots } from "./sessionSeriesRows.tsx";
import { normalizeWeeklySlot, weeklyRowMarks } from "./sessionRowMarks.ts";
import { roomAvailabilityForSlot } from "./roomPickerOptions.ts";
import { instructorAvailabilityForSlot } from "./instructorPickerOptions.ts";
import { countCourseLessonsByInstructor } from "@/components/schedule-assistant/settings/courses/courseInstructorLessonCounts.ts";
import { validateCourseComponentsYaml } from "@/components/schedule-assistant/settings/courses/courseComponentsYamlLint.ts";

const baseSlot: SchemaWeeklyPatternSlot = {
  weekday: Weekday.TUESDAY,
  start_time: "09:00:00",
  end_time: "10:30:00",
  room: "108",
  instructor: "teacher",
};
function configFor(
  slot: SchemaWeeklyPatternSlot = baseSlot,
): SchemaScheduleConfig {
  return {
    term: {
      name: "Fall",
      semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
      starting_day: Weekday.MONDAY,
      days: Object.values(Weekday),
      time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
      sections: [
        {
          code: "core",
          name: "Core",
          programs: [
            {
              code: "P1",
              name: "P1",
              semester: { start_date: "2026-09-07", end_date: "2026-09-28" },
              tracks: [{ code: "T1", name: "T1", groups: ["G1"] }],
            },
            {
              code: "P2",
              name: "P2",
              semester: { start_date: "2026-09-14", end_date: "2026-09-30" },
              tracks: [{ code: "T2", name: "T2", groups: ["G2"] }],
            },
          ],
        },
      ],
    },
    students_groups: [
      { code: "G1", name: "G1", estimated_size: 10 },
      { code: "G2", name: "G2", estimated_size: 10 },
    ],
    rooms: [],
    instructors: [],
    courses: [
      {
        name: "Math",
        section_code: "core",
        components: [
          {
            tag: "lec",
            audience: [],
            sessions: [{ audience: [], weekly_pattern: [slot] }],
          },
        ],
      },
    ],
  } as unknown as SchemaScheduleConfig;
}
function alternating(anchor_week = "2026-09-14"): SchemaWeeklyPatternSlot {
  return { ...baseSlot, alternation: { anchor_week } };
}
const ref: MeetingRef = {
  kind: "wp",
  courseIdx: 0,
  componentIdx: 0,
  seriesIdx: 0,
  slotIdx: 0,
  date: "2026-09-15",
};

describe("weekly alternation", () => {
  it("preserves default weekly dates and treats a partial first week as its calendar phase", () => {
    const config = configFor();
    expect(activeWeeklySlotDates(config, baseSlot, [])).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
      "2026-09-29",
    ]);
    expect(
      activeWeeklySlotDates(config, { ...baseSlot, alternation: null }, []),
    ).toEqual(activeWeeklySlotDates(config, baseSlot, []));
    expect(activeWeeklySlotDates(config, alternating(), [])).toEqual([
      "2026-09-01",
      "2026-09-15",
      "2026-09-29",
    ]);
    expect(
      activeWeeklySlotDates(config, alternating("2026-09-21"), []),
    ).toEqual(["2026-09-08", "2026-09-22"]);
  });

  it("normalizes both dates by starting_day across years, before the anchor and without ISO parity", () => {
    const slot = {
      ...baseSlot,
      weekday: Weekday.TUESDAY,
      alternation: { anchor_week: "2027-01-08" },
    };
    const config = configFor(slot);
    config.term.starting_day = Weekday.WEDNESDAY;
    config.term.semester = { start_date: "2026-12-29", end_date: "2027-01-26" };
    expect(activeWeeklySlotDates(config, slot, [])).toEqual([
      "2026-12-29",
      "2027-01-12",
      "2027-01-26",
    ]);
    expect(
      isWeeklySlotActiveOnDate(slot, "2027-01-05", Weekday.WEDNESDAY),
    ).toBe(false);
    expect(
      isWeeklySlotActiveOnDate(slot, "2026-12-29", Weekday.WEDNESDAY),
    ).toBe(true);
  });

  it("uses audience windows without resetting their phase", () => {
    const config = configFor();
    const slot = alternating("2026-09-21");
    expect(activeWeeklySlotDates(config, slot, ["G1"])).toEqual([
      "2026-09-08",
      "2026-09-22",
    ]);
    expect(activeWeeklySlotDates(config, slot, ["@P2"])).toEqual([
      "2026-09-22",
    ]);
    expect(activeWeeklySlotDates(config, slot, ["G1", "G2"])).toEqual([
      "2026-09-22",
    ]);
  });

  it("shares active source dates between grid, editor, drafts, picker, and instructor counts", () => {
    const slot: SchemaWeeklyPatternSlot = {
      ...alternating(),
      edits: [
        { select_week: "2026-08-31", date: "2026-09-08", cancel: false },
        {
          select_week: "2026-09-07",
          date: "2026-09-09",
          room: "999",
          cancel: false,
        },
        { select_week: "2026-09-14", cancel: true },
      ],
    };
    const config = configFor(slot);
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [slot],
      audienceTokens: [],
    });
    expect(events.map((event) => event.date)).toEqual([
      "2026-09-08",
      "2026-09-15",
      "2026-09-29",
    ]);
    expect(events.filter((event) => event.cancelled)).toHaveLength(1);
    expect(buildMeetings(config).map((meeting) => meeting.date)).toEqual(
      events.map((event) => event.date),
    );
    expect(
      buildMeetings(config).every(
        (meeting) => meeting.alternation?.anchor_week === "2026-09-14",
      ),
    ).toBe(true);
    expect(
      weeklyPickerSlots(config, slot, [], "room").map((item) => item.date),
    ).toEqual(["2026-09-08", "2026-09-29"]);
    expect(
      draftMeetingsFromWeeklySlots(config, [slot], [], -1, new Set()).map(
        (item) => item.date,
      ),
    ).toEqual(["2026-09-08", "2026-09-29"]);
    expect(countWeeklyPatternSlotOccurrences(config, slot, [])).toBe(2);
    expect(
      countCourseLessonsByInstructor(config.courses![0], config)
        .get("teacher")
        ?.get("lec"),
    ).toBe(2);
    expect(inactiveWeeklySlotEdits(config, slot)).toEqual([slot.edits![1]]);
    const saved = serializeWeeklyEventsToSlots({
      config,
      originalSlots: [slot],
      events,
    });
    expect(saved[0].alternation).toEqual(slot.alternation);
    expect(saved[0].edits).toContainEqual(slot.edits![1]);
  });

  it("does not conflict with opposite-phase rooms or instructors but does with matching and weekly dates", () => {
    const config = configFor(alternating());
    const meetings = buildMeetings(config);
    for (const [slot, status] of [
      [alternating("2026-09-21"), "green"],
      [alternating(), "red"],
      [baseSlot, "red"],
    ] as const) {
      const dates = activeWeeklySlotDates(config, slot, []);
      expect(
        roomAvailabilityForSlot({
          config,
          meetings,
          roomId: "108",
          dates,
          start: "09:00",
          end: "10:30",
          audienceSize: 10,
          capacity: 30,
        }).status,
      ).toBe(status);
      expect(
        instructorAvailabilityForSlot({
          config,
          meetings,
          instructorId: "teacher",
          dates,
          start: "09:00",
          end: "10:30",
          weekday: Weekday.TUESDAY,
        }).status,
      ).toBe(status);
    }
  });

  it("preserves and normalizes alternation through explicit edit/create assembly and reopening", () => {
    const slot = alternating("2026-09-17");
    const config = configFor(slot);
    const saved = applySeriesScheduleToCourse(config.courses![0], ref, config, {
      weeklyPattern: [slot],
    })!;
    expect(
      saved.components[0].sessions![0].weekly_pattern![0].alternation,
    ).toEqual({ anchor_week: "2026-09-14" });
    const created = applyCreateMeetingToCourse(config.courses![0], config, {
      courseIdx: 0,
      componentIdx: 0,
      audience: ["G1"],
      placement: "weekly",
      weeklySlots: [slot],
    })!;
    expect(
      created.components[0].sessions!.some((series) =>
        series.weekly_pattern?.some(
          (item) => item.alternation?.anchor_week === "2026-09-14",
        ),
      ),
    ).toBe(true);
    for (const alternation of [{ anchor_week: "2026-09-21" }, null]) {
      const changed = applySeriesScheduleToCourse(saved, ref, config, {
        weeklyPattern: [{ ...slot, alternation }],
      })!;
      const reopened = changed.components[0].sessions![0].weekly_pattern![0];
      expect(reopened.alternation).toEqual(alternation);
      expect(
        normalizeWeeklySlot(structuredClone(reopened)).alternation,
      ).toEqual(alternation);
    }
  });

  it("highlights and restores the phase without losing other fields or inactive edits", () => {
    const original = alternating();
    const current = {
      ...alternating("2026-09-21"),
      room: "999",
      edits: [{ select_week: "2026-09-14", cancel: true }],
    };
    let restored = current as SchemaWeeklyPatternSlot;
    const marks = weeklyRowMarks({
      current,
      original,
      weekdayLabel: "Вт",
      onRestore: (slot) => {
        restored = slot;
      },
    });
    expect(marks.alternation?.mark).toBe("changed");
    marks.alternation?.onRestore?.();
    expect(restored.alternation).toEqual(original.alternation);
    expect(restored.room).toBe("999");
    expect(restored.edits).toEqual(current.edits);
  });

  it("materializes only active dates and detects lossy reverse conversion", () => {
    const config = configFor();
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [alternating()],
      audienceTokens: [],
    });
    const dates = expandOccurrencesToEvents(eventsToOccurrences(events));
    expect(dates.map((event) => event.date)).toEqual([
      "2026-09-01",
      "2026-09-15",
      "2026-09-29",
    ]);
    expect(eventSchedulesEqual(events, dates)).toBe(true);
    const reverse = expandWeeklySlotsToEvents({
      config,
      weeklySlots: eventsToWeeklySlots(dates),
      audienceTokens: [],
    });
    expect(eventSchedulesEqual(dates, reverse)).toBe(false);
    const retained = expandWeeklySlotsToEvents({
      config,
      weeklySlots: [alternating()],
      audienceTokens: [],
    });
    expect(eventSchedulesEqual(dates, retained)).toBe(true);
  });

  it("limits future cancellation and past-preserving bulk edits to active audience dates", () => {
    const config = configFor(alternating());
    config.courses![0].components[0].audience = ["G2"];
    const course = config.courses![0];
    const meeting = buildMeetings(config)[0];
    const cancelled = applyMeetingEditsToCourse(
      course,
      ref,
      meeting,
      config,
      "future",
      { cancel: true },
    )!;
    expect(
      cancelled.components[0].sessions![0].weekly_pattern![0].edits?.map(
        (edit) => edit.select_week,
      ),
    ).toEqual(["2026-09-14", "2026-09-28"]);
    const changed = applyMeetingEditsToCourse(
      course,
      { ...ref, date: "2026-09-29" },
      meeting,
      config,
      "future",
      { room: "999" },
    )!;
    expect(
      changed.components[0].sessions![0].weekly_pattern![0].edits?.map(
        (edit) => edit.select_week,
      ),
    ).toEqual(["2026-09-14"]);
    expect(
      changed.components[0].sessions![0].weekly_pattern![0].alternation,
    ).toEqual(alternating().alternation);
  });

  it("keeps Tuesday/Wednesday teaching and four long labs on opposite phases with independent rooms", () => {
    const slots: SchemaWeeklyPatternSlot[] = [
      ...[Weekday.TUESDAY, Weekday.WEDNESDAY].map((weekday) => ({
        ...alternating(),
        weekday,
      })),
      ...[
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
      ].map((weekday, index) => ({
        ...alternating("2026-09-21"),
        weekday,
        end_time: "12:10:00",
        room: `lab-${index}`,
      })),
    ];
    const config = configFor();
    const expanded = slots.map((slot) =>
      activeWeeklySlotDates(config, slot, []),
    );
    expect(expanded[0]).toEqual(["2026-09-01", "2026-09-15", "2026-09-29"]);
    expect(expanded[1]).toEqual(["2026-09-02", "2026-09-16", "2026-09-30"]);
    expect(expanded.slice(2)).toEqual([
      ["2026-09-08", "2026-09-22"],
      ["2026-09-09", "2026-09-23"],
      ["2026-09-10", "2026-09-24"],
      ["2026-09-11", "2026-09-25"],
    ]);
    const events = expandWeeklySlotsToEvents({
      config,
      weeklySlots: slots,
      audienceTokens: [],
    });
    expect(
      new Set(
        events
          .filter((event) => event.end_time === "12:10:00")
          .map((event) => event.room),
      ),
    ).toEqual(new Set(["lab-0", "lab-1", "lab-2", "lab-3"]));
  });

  it("accepts optional/null YAML alternation but requires its anchor and rejects extra fields", () => {
    function validate(alternation: unknown) {
      return validateCourseComponentsYaml(
        JSON.stringify([
          {
            tag: "lec",
            sessions: [{ weekly_pattern: [{ ...baseSlot, alternation }] }],
          },
        ]),
      );
    }
    expect(validate(undefined).ok).toBe(true);
    expect(validate(null).ok).toBe(true);
    expect(validate({ anchor_week: "2026-09-14" }).ok).toBe(true);
    expect(validate({}).ok).toBe(false);
    expect(validate({ anchor_week: "wrong" }).ok).toBe(false);
    expect(validate({ anchor_week: "2026-09-14", interval: 2 }).ok).toBe(false);
  });
});
