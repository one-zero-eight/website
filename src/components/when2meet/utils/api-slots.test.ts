import { describe, expect, it } from "vitest";
import {
  deriveTimeRangeFromSlots,
  meetingTimeToSlotKeys,
  slotKeysToMeetingTime,
} from "./api-slots.ts";

describe("deriveTimeRangeFromSlots", () => {
  it("returns the default time range for empty slots", () => {
    expect(deriveTimeRangeFromSlots([])).toEqual({
      start: "08:00",
      end: "19:00",
    });
  });

  it("derives the range from unordered slot times", () => {
    expect(deriveTimeRangeFromSlots(["10:00", "09:30", "10:30"])).toEqual({
      start: "09:30",
      end: "11:00",
    });
  });

  it("caps the end time at 24:00", () => {
    expect(deriveTimeRangeFromSlots(["23:00", "23:30"]).end).toBe("24:00");
  });
});

describe("slotKeysToMeetingTime", () => {
  it("preserves Europe/Moscow wall-clock time for a single 30-minute slot", () => {
    const selectedMeetingTime = slotKeysToMeetingTime(
      ["2026-07-03_10:00"],
      ["10:00", "10:30", "11:00"],
    );

    expect(selectedMeetingTime).toEqual({
      start: "2026-07-03T07:00:00.000Z",
      end: "2026-07-03T07:30:00.000Z",
    });
  });
});

describe("meetingTimeToSlotKeys", () => {
  it("maps backend meeting time to covered 30-minute slots with an exclusive end", () => {
    const selectedSlotKeys = meetingTimeToSlotKeys(
      {
        start: "2026-07-03T07:00:00.000Z",
        end: "2026-07-03T08:00:00.000Z",
      },
      ["2026-07-03"],
      ["10:00", "10:30", "11:00"],
    );

    expect(selectedSlotKeys).toEqual(
      new Set(["2026-07-03_10:00", "2026-07-03_10:30"]),
    );
  });
});
