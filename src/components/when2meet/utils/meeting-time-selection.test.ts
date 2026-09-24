import { describe, expect, it } from "vitest";
import {
  getAllowedMeetingInterval,
  getFutureMeetingSlotKeys,
  isMeetingTimeInFuture,
  isPastMeetingTimeError,
} from "./meeting-time-selection.ts";

const now = Date.parse("2027-06-15T09:00:00Z");
const dateIds = ["2027-06-15", "2027-06-16"];
const timeSlots = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];
const slot = (time: string) => `2027-06-15_${time}`;

describe("final meeting time", () => {
  it.each([
    ["2027-06-15T08:00:00Z", false],
    ["2027-06-15T09:00:00Z", false],
    ["2027-06-15T12:00:00+03:00", false],
    ["2027-06-15T12:00:01+03:00", true],
    ["2027-06-16T08:00:00Z", true],
  ])("checks start %s against the current moment", (start, expected) => {
    expect(
      isMeetingTimeInFuture({ start, end: "2027-06-16T13:00:00Z" }, now),
    ).toBe(expected);
  });

  it("blocks Moscow wall-clock slots through the current start", () => {
    const allowed = new Set([
      "2027-06-14_13:00",
      ...timeSlots.map(slot),
      "2027-06-16_11:00",
    ]);
    expect([...getFutureMeetingSlotKeys(allowed, now)]).toEqual([
      slot("12:30"),
      slot("13:00"),
      slot("13:30"),
      "2027-06-16_11:00",
    ]);
    expect(allowed.has(slot("11:00"))).toBe(true);
  });

  it("invalidates a selection when its start arrives", () => {
    const selection = {
      start: "2027-06-15T09:30:00Z",
      end: "2027-06-15T10:00:00Z",
    };
    expect(isMeetingTimeInFuture(selection, now)).toBe(true);
    expect(isMeetingTimeInFuture(selection, now + 30 * 60 * 1000)).toBe(false);
  });
});

describe("meeting interval selection", () => {
  it("stops a backwards drag at the past boundary", () => {
    expect(
      getAllowedMeetingInterval(
        slot("13:30"),
        slot("11:00"),
        dateIds,
        timeSlots,
        now,
      ),
    ).toEqual([slot("13:30"), slot("13:00"), slot("12:30")]);
  });

  it("cannot start at a past or current slot", () => {
    expect(
      getAllowedMeetingInterval(
        slot("12:00"),
        slot("13:30"),
        dateIds,
        timeSlots,
        now,
      ),
    ).toEqual([]);
  });

  it("does not cross an unavailable slot", () => {
    expect(
      getAllowedMeetingInterval(
        slot("12:30"),
        slot("13:30"),
        dateIds,
        timeSlots,
        now,
        new Set([slot("12:30"), slot("13:30")]),
      ),
    ).toEqual([slot("12:30")]);
  });

  it("keeps the interval on the initial date", () => {
    expect(
      getAllowedMeetingInterval(
        slot("12:30"),
        "2027-06-16_13:30",
        dateIds,
        timeSlots,
        now,
      ),
    ).toEqual([slot("12:30"), slot("13:00"), slot("13:30")]);
  });

  it("rechecks an expired drag against fresh time", () => {
    expect(
      getAllowedMeetingInterval(
        slot("12:30"),
        slot("13:30"),
        dateIds,
        timeSlots,
        now + 30 * 60 * 1000,
      ),
    ).toEqual([]);
  });
});

describe("past-time API error", () => {
  it("recognizes the specific server rejection", () => {
    expect(
      isPastMeetingTimeError({
        httpCode: 400,
        body: { detail: { code: "selected_time_in_past" } },
      }),
    ).toBe(true);
  });

  it.each([
    new TypeError("Network error"),
    { httpCode: 409, body: { detail: "Archived meeting cannot be modified" } },
    { httpCode: 400, body: { detail: "Cannot clear selected meeting time" } },
    { httpCode: 400, body: { detail: { code: "another_error" } } },
  ])("leaves other errors to normal handling", (error) => {
    expect(isPastMeetingTimeError(error)).toBe(false);
  });
});
