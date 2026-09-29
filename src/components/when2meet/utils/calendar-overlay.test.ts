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
    vi.restoreAllMocks();
  });

  const timedEventIcs = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:lecture",
    "DTSTART:20260703T100000Z",
    "DTEND:20260703T110000Z",
    "SUMMARY:Lecture",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  function stubCalendarFetch(responses: Record<string, Response | Error>) {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const response = responses[String(input)];

        if (response instanceof Error) {
          throw response;
        }

        if (!response) {
          throw new Error(`Unexpected calendar URL: ${String(input)}`);
        }

        return response;
      }),
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  }

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

  it.each([404, 503])(
    "keeps successful events when another calendar responds with HTTP %s",
    async (status) => {
      stubCalendarFetch({
        "https://calendar.test/working.ics": new Response(timedEventIcs, {
          status: 200,
        }),
        "https://calendar.test/failing.ics": new Response(null, { status }),
      });

      const events = await fetchPersonalCalendarEvents(
        [
          "https://calendar.test/working.ics",
          "https://calendar.test/failing.ics",
        ],
        new Date("2026-07-03T00:00:00Z"),
        new Date("2026-07-03T23:59:59Z"),
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.title).toBe("Lecture");
      expect(console.warn).toHaveBeenCalledOnce();
    },
  );

  it("keeps successful events when another calendar has a network error", async () => {
    stubCalendarFetch({
      "https://calendar.test/working.ics": new Response(timedEventIcs, {
        status: 200,
      }),
      "https://calendar.test/failing.ics": new TypeError("Failed to fetch"),
    });

    const events = await fetchPersonalCalendarEvents(
      [
        "https://calendar.test/working.ics",
        "https://calendar.test/failing.ics",
      ],
      new Date("2026-07-03T00:00:00Z"),
      new Date("2026-07-03T23:59:59Z"),
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Lecture");
  });

  it("keeps successful events when another calendar contains invalid ICS", async () => {
    stubCalendarFetch({
      "https://calendar.test/working.ics": new Response(timedEventIcs, {
        status: 200,
      }),
      "https://calendar.test/invalid.ics": new Response("not an ICS file", {
        status: 200,
      }),
    });

    const events = await fetchPersonalCalendarEvents(
      [
        "https://calendar.test/working.ics",
        "https://calendar.test/invalid.ics",
      ],
      new Date("2026-07-03T00:00:00Z"),
      new Date("2026-07-03T23:59:59Z"),
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Lecture");
  });

  it("returns no events when every calendar fails", async () => {
    stubCalendarFetch({
      "https://calendar.test/not-found.ics": new Response(null, {
        status: 404,
      }),
      "https://calendar.test/unavailable.ics": new Response(null, {
        status: 503,
      }),
    });

    await expect(
      fetchPersonalCalendarEvents(
        [
          "https://calendar.test/not-found.ics",
          "https://calendar.test/unavailable.ics",
        ],
        new Date("2026-07-03T00:00:00Z"),
        new Date("2026-07-03T23:59:59Z"),
      ),
    ).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
