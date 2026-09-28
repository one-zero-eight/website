import { describe, expect, it } from "vitest";
import {
  getLocalCalendarDay,
  normalizeDashboardIcs,
  normalizeDashboardMeetings,
} from "./dashboard-calendar-data.ts";

const nowMs = new Date(2026, 5, 15, 12).getTime();
function calendar(...events: string[]) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join(
    "\r\n",
  );
}
function event(...properties: string[]) {
  return ["BEGIN:VEVENT", ...properties, "END:VEVENT"].join("\r\n");
}
function normalize(...events: string[]) {
  return normalizeDashboardIcs(calendar(...events), "test", nowMs);
}
const recurring = event(
  "UID:series",
  "SUMMARY:Class",
  "DTSTART:20260614T100000",
  "DTEND:20260614T110000",
  "RRULE:FREQ=DAILY;COUNT=4",
);

describe("dashboard ICS normalization", () => {
  it("keeps local-day overlaps, including ended and overnight events, without UI sorting/limiting", () => {
    const result = normalize(
      event(
        "UID:overnight",
        "SUMMARY:Overnight",
        "LOCATION:Room 101",
        "DTSTART:20260614T230000",
        "DTEND:20260615T010000",
      ),
      event("UID:ended", "DTSTART:20260615T090000", "DTEND:20260615T100000"),
      event("UID:tomorrow", "DTSTART:20260616T000000", "DTEND:20260616T010000"),
      event(
        "UID:yesterday",
        "DTSTART:20260614T220000",
        "DTEND:20260615T000000",
      ),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: "Overnight",
      location: "Room 101",
      start: new Date(2026, 5, 14, 23),
      end: new Date(2026, 5, 15, 1),
      allDay: false,
    });
    expect(result[1].title).toBe("Untitled event");
  });

  it("retains date-only all-day spans with exclusive local-midnight ends", () => {
    const result = normalize(
      event(
        "UID:all-day",
        "DTSTART;VALUE=DATE:20260615",
        "DTEND;VALUE=DATE:20260616",
      ),
      event(
        "UID:multi-day",
        "DTSTART;VALUE=DATE:20260614",
        "DTEND;VALUE=DATE:20260617",
      ),
      event(
        "UID:past",
        "DTSTART;VALUE=DATE:20260614",
        "DTEND;VALUE=DATE:20260615",
      ),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      start: new Date(2026, 5, 15),
      end: new Date(2026, 5, 16),
      allDay: true,
    });
  });

  it("applies full-calendar default durations when DTEND and DURATION are absent", () => {
    const result = normalize(
      event("UID:date-only", "DTSTART;VALUE=DATE:20260615"),
      event("UID:timed", "DTSTART:20260615T100000"),
      event("UID:previous-night", "DTSTART:20260614T233000"),
    );
    expect(result).toHaveLength(3);
    expect(result[0].end).toEqual(new Date(2026, 5, 16));
    expect(result[1].end).toEqual(new Date(2026, 5, 15, 11));
    expect(result[2].end).toEqual(new Date(2026, 5, 15, 0, 30));
  });

  it("expands recurrence and applies duration", () => {
    const result = normalize(
      event(
        "UID:duration",
        "DTSTART:20260614T100000",
        "DURATION:PT90M",
        "RRULE:FREQ=DAILY;COUNT=3",
      ),
    );
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(new Date(2026, 5, 15, 10));
    expect(result[0].end).toEqual(new Date(2026, 5, 15, 11, 30));
  });

  it("does not truncate series that started more than 1000 occurrences ago", () => {
    const result = normalize(
      event(
        "UID:old",
        "DTSTART:20200101T100000",
        "DTEND:20200101T110000",
        "RRULE:FREQ=DAILY",
      ),
    );
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(new Date(2026, 5, 15, 10));
  });

  it("fails visibly instead of scanning an unbounded minutely recurrence", () => {
    expect(() =>
      normalize(
        event(
          "UID:frequent",
          "DTSTART:20260101T100000",
          "DURATION:PT1M",
          "RRULE:FREQ=MINUTELY",
        ),
      ),
    ).toThrow("Calendar test exceeds the 10000-iteration recurrence limit");
  });

  it("shares the recurrence budget across all series in a feed", () => {
    const series = Array.from({ length: 5 }, (_, index) =>
      event(
        `UID:old-${index}`,
        "DTSTART:20200101T100000",
        "DTEND:20200101T110000",
        "RRULE:FREQ=DAILY",
      ),
    );
    expect(() => normalize(...series)).toThrow(
      "10000-iteration recurrence limit",
    );
    // Each individual series fits; the cap is per feed, not globally shared.
    expect(normalize(series[0])).toHaveLength(1);
  });

  it("honors every value in a multi-value EXDATE", () => {
    expect(
      normalize(
        event(
          "UID:excluded",
          "DTSTART:20260614T100000",
          "DTEND:20260614T110000",
          "RRULE:FREQ=DAILY;COUNT=4",
          "EXDATE:20260614T100000,20260615T100000",
        ),
      ),
    ).toEqual([]);
  });

  it("replaces recurring instances and inherits missing title/location", () => {
    const result = normalize(
      recurring,
      event(
        "UID:series",
        "RECURRENCE-ID:20260615T100000",
        "DTSTART:20260615T140000",
        "DTEND:20260615T150000",
        "LOCATION:Library",
      ),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Class",
      location: "Library",
      start: new Date(2026, 5, 15, 14),
    });
    expect(result[0].id).toBe("test:series:2026-06-15T10:00:00");
  });

  it("keeps exceptions scoped to their UID when unrelated series share start times", () => {
    const result = normalize(
      recurring,
      event(
        "UID:other-series",
        "SUMMARY:Other class",
        "DTSTART:20260614T100000",
        "DTEND:20260614T110000",
        "RRULE:FREQ=DAILY;COUNT=4",
      ),
      event(
        "UID:series",
        "RECURRENCE-ID:20260615T100000",
        "DTSTART:20260615T140000",
        "DTEND:20260615T150000",
      ),
    );
    expect(result).toHaveLength(2);
    expect(
      result.map((activity) => [activity.uid, activity.start.getHours()]),
    ).toEqual([
      ["other-series", 10],
      ["series", 14],
    ]);
    expect(new Set(result.map((activity) => activity.id)).size).toBe(2);
  });

  it("includes exceptions moved into today and excludes those moved away", () => {
    const result = normalize(
      recurring,
      event(
        "UID:series",
        "RECURRENCE-ID:20260614T100000",
        "DTSTART:20260615T080000",
        "DTEND:20260615T090000",
      ),
      event(
        "UID:series",
        "RECURRENCE-ID:20260615T100000",
        "DTSTART:20260616T120000",
        "DTEND:20260616T130000",
      ),
    );
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(new Date(2026, 5, 15, 8));
  });

  it("suppresses cancelled instances even without DTSTART, and cancelled series/singles", () => {
    expect(
      normalize(
        recurring,
        event(
          "UID:series",
          "RECURRENCE-ID:20260615T100000",
          "STATUS:CANCELLED",
        ),
      ),
    ).toEqual([]);
    expect(
      normalize(
        event(
          "UID:cancelled",
          "DTSTART:20260615T100000",
          "DTEND:20260615T110000",
          "STATUS:CANCELLED",
        ),
      ),
    ).toEqual([]);
    expect(
      normalize(
        event(
          "UID:cancelled-series",
          "DTSTART:20260614T100000",
          "DTEND:20260614T110000",
          "RRULE:FREQ=DAILY;COUNT=4",
          "STATUS:CANCELLED",
        ),
      ),
    ).toEqual([]);
  });

  it("keeps UTC timestamps as instants", () => {
    const result = normalize(
      event("UID:utc", "DTSTART:20260615T100000Z", "DTEND:20260615T110000Z"),
    );
    expect(result[0].start.toISOString()).toBe("2026-06-15T10:00:00.000Z");
  });

  it("resolves embedded VTIMEZONE offsets", () => {
    const timezone = [
      "BEGIN:VTIMEZONE",
      "TZID:Custom/PlusThree",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0300",
      "TZOFFSETTO:+0300",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
    const result = normalizeDashboardIcs(
      calendar(
        timezone,
        event(
          "UID:zoned",
          "DTSTART;TZID=Custom/PlusThree:20260615T100000",
          "DTEND;TZID=Custom/PlusThree:20260615T110000",
        ),
      ),
      "test",
      nowMs,
    );
    expect(result[0].start.toISOString()).toBe("2026-06-15T07:00:00.000Z");
  });

  it("namespaces stable occurrence IDs by source", () => {
    const ics = calendar(recurring);
    expect(normalizeDashboardIcs(ics, "first", nowMs)[0].id).not.toBe(
      normalizeDashboardIcs(ics, "second", nowMs)[0].id,
    );
    expect(normalizeDashboardIcs(ics, "first", nowMs)).toEqual(
      normalizeDashboardIcs(ics, "first", nowMs + 1000),
    );
  });

  it("distinguishes valid empty calendars from malformed feeds", () => {
    expect(() =>
      normalizeDashboardIcs('{"error":"failed"}', "broken", nowMs),
    ).toThrow();
    expect(normalizeDashboardIcs(calendar(), "empty", nowMs)).toEqual([]);
  });

  it("re-expands on local midnight and keeps day boundaries local", () => {
    const day = getLocalCalendarDay(nowMs);
    expect(day).toEqual({
      start: new Date(2026, 5, 15),
      end: new Date(2026, 5, 16),
    });
    expect(
      normalizeDashboardIcs(calendar(recurring), "test", day.end.getTime())[0]
        .start,
    ).toEqual(new Date(2026, 5, 16, 10));
  });
});

describe("dashboard When2Meet normalization", () => {
  it("uses selected ISO instants and ignores unscheduled/out-of-day meetings", () => {
    const result = normalizeDashboardMeetings(
      [
        {
          slug: "today",
          name: "Study",
          selected_time: {
            start: "2026-06-15T12:00:00+03:00",
            end: "2026-06-15T13:00:00+03:00",
          },
        },
        { slug: "unscheduled", name: "Voting" },
        {
          slug: "future",
          name: "Later",
          selected_time: {
            start: "2026-06-17T10:00:00Z",
            end: "2026-06-17T11:00:00Z",
          },
        },
      ],
      nowMs,
    );
    expect(result).toEqual([
      {
        id: "when2meet:today",
        title: "Study",
        start: new Date("2026-06-15T09:00:00Z"),
        end: new Date("2026-06-15T10:00:00Z"),
      },
    ]);
  });
});
