import { afterEach, describe, expect, it, vi } from "vitest";
import { slotKeyToDateRange } from "./api-slots.ts";
import {
  buildCalendarAllDayOverlay,
  buildCalendarSlotOverlay,
  fetchPersonalCalendarEvents,
  getCalendarConflictSlotKeys,
  type PersonalCalendarEvent,
} from "./calendar-overlay.ts";
import { getSlotKey } from "./slots.ts";

describe("when2meet personal calendar overlay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps timed events in slots and marks selected conflicts", () => {
    const slotKey = getSlotKey("2026-07-03", "10:00");
    const { start, end } = slotKeyToDateRange(slotKey);
    const slotEvents = buildCalendarSlotOverlay(
      [{ title: "Lecture", allDay: false, start, end }],
      ["2026-07-03"],
      ["10:00", "10:30"],
      new Set([slotKey]),
    );

    expect(slotEvents.get(slotKey)).toEqual(["Lecture"]);
    expect(
      getCalendarConflictSlotKeys(new Set([slotKey]), slotEvents),
    ).toContain(slotKey);
  });

  it("puts all-day events only in the date overlay with an exclusive end", () => {
    const allDayEvent: PersonalCalendarEvent = {
      title: "Linen change",
      allDay: true,
      startDateId: "2026-07-03",
      endDateIdExclusive: "2026-07-05",
    };
    const dateIds = ["2026-07-03", "2026-07-04", "2026-07-05"];

    const allDayEvents = buildCalendarAllDayOverlay(
      [allDayEvent, allDayEvent],
      dateIds,
    );
    const slotEvents = buildCalendarSlotOverlay([allDayEvent], dateIds, [
      "00:00",
      "12:00",
    ]);

    expect(allDayEvents.get("2026-07-03")).toEqual(["Linen change"]);
    expect(allDayEvents.get("2026-07-04")).toEqual(["Linen change"]);
    expect(allDayEvents.has("2026-07-05")).toBe(false);
    expect(slotEvents.size).toBe(0);
  });

  it("preserves all-day calendar dates while parsing ICS", async () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            [
              "BEGIN:VCALENDAR",
              "VERSION:2.0",
              "BEGIN:VEVENT",
              "UID:linen-change",
              "DTSTART;VALUE=DATE:20260703",
              "DTEND;VALUE=DATE:20260705",
              "SUMMARY:Linen change",
              "END:VEVENT",
              "END:VCALENDAR",
            ].join("\r\n"),
            { status: 200 },
          ),
      ),
    );

    const events = await fetchPersonalCalendarEvents(
      ["https://calendar.test/events.ics"],
      new Date("2026-07-03T00:00:00"),
      new Date("2026-07-05T23:59:59"),
    );

    expect(events).toEqual([
      {
        title: "Linen change",
        allDay: true,
        startDateId: "2026-07-03",
        endDateIdExclusive: "2026-07-05",
      },
    ]);
  });
});
