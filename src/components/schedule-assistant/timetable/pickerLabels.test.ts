import { describe, expect, it, vi } from "vitest";

import {
  formatPickerConflictDates,
  formatPickerLoadHint,
} from "./pickerLabels.ts";

const FRIDAYS = ["2026-09-04", "2026-09-11", "2026-09-18"];

describe("formatPickerLoadHint", () => {
  it.each([
    [0, "classes"],
    [1, "class"],
    [2, "classes"],
    [5, "classes"],
    [11, "classes"],
    [21, "classes"],
  ])("uses plural for %i lessons", (count, noun) => {
    expect(formatPickerLoadHint([FRIDAYS[0]], () => count, false)).toBe(
      `${count} ${noun} per day`,
    );
  });

  it("uses the actual date load range for a weekly slot", () => {
    const loads: Record<string, number> = {
      "2026-09-04": 2,
      "2026-09-11": 5,
      "2026-09-18": 3,
    };
    expect(formatPickerLoadHint(FRIDAYS, (date) => loads[date], true)).toBe(
      "2–5 classes on Fridays",
    );
  });

  it("does not repeat an equal range", () => {
    expect(formatPickerLoadHint(FRIDAYS, () => 3, true)).toBe(
      "3 classes on Fridays",
    );
  });

  it("includes dates without lessons in the range", () => {
    expect(
      formatPickerLoadHint(
        FRIDAYS,
        (date) => (date === FRIDAYS[0] ? 2 : 0),
        true,
      ),
    ).toBe("0–2 classes on Fridays");
  });

  it("labels moved sessions on mixed weekdays without a weekly claim", () => {
    expect(
      formatPickerLoadHint(
        [FRIDAYS[0], "2026-09-12"],
        (date) => (date === FRIDAYS[0] ? 2 : 5),
        true,
      ),
    ).toBe("2–5 classes on class days");
  });

  it.each([
    ["2026-09-07", "Mondays"],
    ["2026-09-08", "Tuesdays"],
    ["2026-09-09", "Wednesdays"],
    ["2026-09-10", "Thursdays"],
    ["2026-09-11", "Fridays"],
    ["2026-09-12", "Saturdays"],
    ["2026-09-13", "Sundays"],
  ])("labels the actual weekday of %s", (date, weekday) => {
    expect(formatPickerLoadHint([date], () => 1, true)).toBe(
      `1 class on ${weekday}`,
    );
  });

  it("counts each actual date once", () => {
    const countForDate = vi.fn(() => 4);
    expect(
      formatPickerLoadHint([FRIDAYS[0], FRIDAYS[0]], countForDate, false),
    ).toBe("4 classes per day");
    expect(countForDate).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    "handles missing dates when weekly is %s",
    (weekly) => {
      const countForDate = vi.fn(() => 0);
      expect(formatPickerLoadHint([], countForDate, weekly)).toBe(
        "No class dates",
      );
      expect(countForDate).not.toHaveBeenCalled();
    },
  );
});

describe("formatPickerConflictDates", () => {
  it("sorts and deduplicates exact dates including the year", () => {
    expect(
      formatPickerConflictDates([FRIDAYS[1], FRIDAYS[0], FRIDAYS[1]]),
    ).toBe("04.09.2026, 11.09.2026");
  });

  it("does not truncate a long list of conflict dates", () => {
    const dates = Array.from(
      { length: 20 },
      (_, index) => `2026-09-${String(index + 1).padStart(2, "0")}`,
    );
    expect(formatPickerConflictDates(dates).split(", ")).toEqual(
      dates.map((_, index) => `${String(index + 1).padStart(2, "0")}.09.2026`),
    );
  });

  it("handles missing dates without implying weekly conflicts", () => {
    expect(formatPickerConflictDates([])).toBe("No class dates");
  });
});
