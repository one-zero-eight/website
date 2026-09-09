import {
  Weekday,
  type SchemaScheduleConfig,
  type SchemaCourseConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { describe, expect, it } from "vitest";

import {
  applyEditableEventsToCourse,
  eventsEqual,
  eventsToOccurrences,
  eventsToWeeklySlots,
  expandOccurrencesToEvents,
  expandWeeklySlotsToEvents,
  patchEditableEvents,
  serializeOccurrenceEvents,
  serializeWeeklyEventsToSlots,
} from "./editableSessionEvents.ts";
import { countWeeklyPatternSlotOccurrences } from "./timetableViewerModel.ts";
import { restoreMeetingInCourse } from "./meetingEditUtils.ts";

function testConfig(): SchemaScheduleConfig {
  return {
    term: {
      name: "Fall 2026",
      semester: { start_date: "2026-09-01", end_date: "2026-09-28" },
      days: [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
      ],
      starting_day: Weekday.MONDAY,
      time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
      sections: [],
    },
    rooms: [],
    instructors: [],
    courses: [],
  };
}

describe("session notes", () => {
  const slot: SchemaWeeklyPatternSlot = {
    weekday: Weekday.MONDAY,
    start_time: "09:00:00",
    end_time: "10:30:00",
    edits: [
      { select_week: "2026-09-07", notes: "Bring a laptop", cancel: false },
      { select_week: "2026-09-14", notes: "", cancel: false },
    ],
  };
  const ref = {
    kind: "wp",
    courseIdx: 0,
    componentIdx: 0,
    seriesIdx: 0,
    slotIdx: 0,
    date: "2026-09-07",
  } as const;
  function courseWithNotes(weeklySlot = slot): SchemaCourseConfig {
    return {
      name: "Math",
      section_code: "core",
      components: [
        {
          tag: "lec",
          instructor_pool: [],
          audience: [],
          per_group: false,
          sessions: [
            {
              audience: [],
              notes: "Series notes",
              weekly_pattern: [weeklySlot],
            },
          ],
        },
      ],
    };
  }
  function expand(weeklySlots = [slot]) {
    return expandWeeklySlotsToEvents({
      config: testConfig(),
      weeklySlots,
      audienceTokens: [],
    });
  }

  it("keeps raw null, empty and explicit overrides through unrelated changes", () => {
    const events = expand();
    expect(events.map((event) => event.notes)).toEqual([
      "Bring a laptop",
      "",
      null,
      null,
    ]);
    const patched = patchEditableEvents(
      events,
      events.map((event) => event.key),
      { room: "104", start_time: "11:00" },
    );
    const slots = serializeWeeklyEventsToSlots({
      originalSlots: [slot],
      events: patched,
      config: testConfig(),
    });
    expect(expand(slots).map((event) => event.notes)).toEqual(
      events.map((event) => event.notes),
    );
  });

  it("detects notes-only changes, preserves whitespace and resets inheritance", () => {
    const events = expand();
    const updated = patchEditableEvents(events, [events[2].key], {
      notes: "  Agenda\nhttps://example.com  ",
    });
    expect(eventsEqual(events, updated)).toBe(false);
    expect(updated[2].notes).toBe("  Agenda\nhttps://example.com  ");
    const reset = patchEditableEvents(
      updated,
      [events[0].key, events[1].key, events[2].key],
      { notes: null },
    );
    expect(
      serializeWeeklyEventsToSlots({
        originalSlots: [slot],
        events: reset,
        config: testConfig(),
      })[0].edits,
    ).toBeNull();
  });

  it("preserves override states through weekly and date conversions", () => {
    const events = expand();
    const dates = expandOccurrencesToEvents(eventsToOccurrences(events));
    expect(
      serializeOccurrenceEvents(dates).map((event) => event.notes),
    ).toEqual(["Bring a laptop", "", null, null]);
    const weekly = eventsToWeeklySlots(dates, Weekday.SUNDAY);
    expect(weekly).toHaveLength(1);
    expect(weekly[0].edits?.map((edit) => edit.select_week)).toEqual([
      "2026-09-06",
      "2026-09-13",
    ]);
    const config = testConfig();
    config.term.starting_day = Weekday.SUNDAY;
    expect(
      expandWeeklySlotsToEvents({
        config,
        weeklySlots: weekly,
        audienceTokens: [],
      }).map((event) => event.notes),
    ).toEqual(["Bring a laptop", "", null, null]);
  });

  it("saves series-only edits without flattening per-date inheritance", () => {
    const events = expand();
    for (const placement of ["weekly", "dates_pattern"] as const) {
      const next = applyEditableEventsToCourse({
        course: courseWithNotes(),
        meetingRef: ref,
        config: testConfig(),
        notes: "Updated series",
        placement,
        weeklySlots: [slot],
        events:
          placement === "weekly"
            ? events
            : expandOccurrencesToEvents(eventsToOccurrences(events)),
      });
      const series = next?.components[0].sessions?.[0];
      expect(series?.notes).toBe("Updated series");
      const savedEvents =
        placement === "weekly"
          ? expand(series?.weekly_pattern ?? [])
          : expandOccurrencesToEvents(series?.dates_pattern ?? []);
      expect(savedEvents.map((event) => event.notes)).toEqual([
        "Bring a laptop",
        "",
        null,
        null,
      ]);
    }
  });

  it.each(["Bring a laptop", ""])(
    "retains %j notes when cancelling and restoring",
    (notes) => {
      const original = {
        ...slot,
        edits: [{ select_week: "2026-09-07", cancel: false, notes }],
      };
      const events = expand([original]);
      const cancelled = patchEditableEvents(events, [events[0].key], {
        cancelled: true,
      });
      const saved = serializeWeeklyEventsToSlots({
        originalSlots: [original],
        events: cancelled,
        config: testConfig(),
      });
      const restored = restoreMeetingInCourse(
        courseWithNotes(saved[0]),
        ref,
        testConfig(),
      );
      const edit =
        restored?.components[0].sessions?.[0].weekly_pattern?.[0].edits?.[0];
      expect(edit?.notes).toBe(notes);
      expect(edit?.cancel).toBe(false);
    },
  );
});

describe("editableSessionEvents", () => {
  it("retains weekly base values independently of saved and draft overrides", () => {
    const events = expandWeeklySlotsToEvents({
      config: testConfig(),
      audienceTokens: [],
      weeklySlots: [
        {
          weekday: Weekday.MONDAY,
          start_time: "09:00:00",
          end_time: "10:30:00",
          room: "108",
          instructor: "a@iu.ru",
          edits: [
            {
              select_week: "2026-09-07",
              cancel: false,
              date: "2026-09-08",
              start_time: "11:00:00",
              room: "104",
              instructor: "b@iu.ru",
            },
          ],
        },
      ],
    });
    const event = events[0];
    expect(event.date).toBe("2026-09-08");
    expect(event.room).toBe("104");
    expect(event.weeklyBase).toEqual({
      date: "2026-09-07",
      start_time: "09:00:00",
      end_time: "10:30:00",
      room: "108",
      instructor: "a@iu.ru",
    });
    const patched = patchEditableEvents(events, [event.key], { room: "105" });
    expect(patched[0].weeklyBase).toEqual(event.weeklyBase);
  });
  it("expands weekly slots with stable keys and applies cancel edits", () => {
    const events = expandWeeklySlotsToEvents({
      config: testConfig(),
      audienceTokens: [],
      weeklySlots: [
        {
          weekday: Weekday.MONDAY,
          start_time: "09:00:00",
          end_time: "10:30:00",
          room: "108",
          instructor: "a@iu.ru",
          edits: [
            {
              select_week: "2026-09-14",
              cancel: true,
            },
          ],
        },
      ],
    });

    expect(events.map((event) => event.date)).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    expect(events.every((event) => event.key.startsWith("wp:0:"))).toBe(true);
    expect(events.find((event) => event.date === "2026-09-14")?.cancelled).toBe(
      true,
    );
  });

  it("counts weekly semester lessons except cancelled weeks", () => {
    const count = countWeeklyPatternSlotOccurrences(
      testConfig(),
      {
        weekday: Weekday.MONDAY,
        start_time: "09:00:00",
        end_time: "10:30:00",
        room: "108",
        instructor: "a@iu.ru",
        edits: [{ select_week: "2026-09-14", cancel: true }],
      },
      [],
    );

    expect(count).toBe(3);
  });

  it("serializes weekly patches as overrides and preserves unrelated edits", () => {
    const config = testConfig();
    const slots = [
      {
        weekday: Weekday.MONDAY,
        start_time: "09:00:00",
        end_time: "10:30:00",
        room: "108",
        instructor: "a@iu.ru",
        edits: [
          {
            select_week: "2026-08-31",
            cancel: false,
            room: "999",
          },
        ],
      },
    ];
    const events = expandWeeklySlotsToEvents({
      config,
      audienceTokens: [],
      weeklySlots: slots,
    });
    const patched = patchEditableEvents(events, [events[0]!.key], {
      start_time: "10:40:00",
      end_time: "12:10:00",
      room: "107",
    });
    const cancelled = patchEditableEvents(patched, [patched[1]!.key], {
      cancelled: true,
    });
    const moved = patchEditableEvents(cancelled, [cancelled[2]!.key], {
      date: "2026-09-22",
    });

    const nextSlots = serializeWeeklyEventsToSlots({
      originalSlots: slots,
      events: moved,
      config,
    });
    const edits = nextSlots[0]!.edits ?? [];
    expect(edits.some((edit) => edit.select_week === "2026-08-31")).toBe(true);
    expect(
      edits.some(
        (edit) =>
          edit.select_week.startsWith("2026-09-07") &&
          String(edit.start_time).startsWith("10:40") &&
          edit.room === "107",
      ),
    ).toBe(true);
    expect(
      edits.some(
        (edit) =>
          edit.select_week.startsWith("2026-09-14") && edit.cancel === true,
      ),
    ).toBe(true);
    expect(
      edits.some(
        (edit) =>
          edit.select_week.startsWith("2026-09-21") &&
          edit.date === "2026-09-22",
      ),
    ).toBe(true);
  });

  it("bulk patches only selected events and drops no-op weekly edits", () => {
    const config = testConfig();
    const slots = [
      {
        weekday: Weekday.MONDAY,
        start_time: "09:00:00",
        end_time: "10:30:00",
        room: "108",
        instructor: "a@iu.ru",
        edits: null,
      },
    ];
    const events = expandWeeklySlotsToEvents({
      config,
      audienceTokens: [],
      weeklySlots: slots,
    });
    const selected = [events[0]!.key, events[1]!.key];
    const patched = patchEditableEvents(events, selected, {
      instructor: "b@iu.ru",
    });
    expect(patched[0]!.instructor).toBe("b@iu.ru");
    expect(patched[1]!.instructor).toBe("b@iu.ru");
    expect(patched[2]!.instructor).toBe("a@iu.ru");

    const restored = patchEditableEvents(patched, [patched[0]!.key], {
      instructor: "a@iu.ru",
    });
    const nextSlots = serializeWeeklyEventsToSlots({
      originalSlots: slots,
      events: restored,
      config,
    });
    const edits = nextSlots[0]!.edits ?? [];
    expect(edits).toHaveLength(1);
    expect(edits[0]!.instructor).toBe("b@iu.ru");
  });

  it("serializes dates_pattern events and hard-deletes cancelled new rows", () => {
    const events = expandOccurrencesToEvents([
      {
        date: "2026-09-08",
        start_time: "09:00:00",
        end_time: "10:30:00",
        room: "108",
        instructor: "a@iu.ru",
      },
      {
        date: "2026-09-15",
        start_time: "09:00:00",
        end_time: "10:30:00",
        room: "108",
        instructor: "a@iu.ru",
      },
    ]);
    const next = patchEditableEvents(events, [events[0]!.key], {
      cancelled: true,
    });
    const serialized = serializeOccurrenceEvents(next);
    expect(serialized).toHaveLength(1);
    expect(serialized[0]!.date).toBe("2026-09-15");
  });
});
