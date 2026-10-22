import { describe, expect, it } from "vitest";
import { formatTrainingHistoryDateTimeMoscow } from "./sport-week-utils";

describe("formatTrainingHistoryDateTimeMoscow", () => {
  it.each(["en", "ru"])("converts UTC to Moscow time for %s", (locale) => {
    expect(
      formatTrainingHistoryDateTimeMoscow("2026-10-23", "16:00", locale),
    ).toBe("2026-10-23 19:00");
  });

  it("moves late UTC trainings to the next Moscow date", () => {
    expect(
      formatTrainingHistoryDateTimeMoscow("2026-10-23", "22:30", "ru"),
    ).toBe("2026-10-24 01:30");
  });

  it("handles year rollover", () => {
    expect(
      formatTrainingHistoryDateTimeMoscow("2026-12-31", "21:00", "en"),
    ).toBe("2027-01-01 00:00");
  });
});
