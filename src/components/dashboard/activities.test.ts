import { describe, expect, it } from "vitest";
import {
  type DashboardActivity,
  formatActivityTime,
  getActivityStatus,
  getUpcomingActivities,
} from "./activities.ts";

const now = new Date(2026, 0, 10, 12).getTime();
function activity(
  startMinutes: number,
  endMinutes = startMinutes + 60,
): DashboardActivity {
  return {
    id: String(startMinutes),
    title: "Activity",
    start: new Date(now + startMinutes * 60_000),
    end: new Date(now + endMinutes * 60_000),
  };
}

describe("dashboard activity selection", () => {
  it("keeps ongoing activities, excludes ended and invalid intervals, and sorts without mutating input", () => {
    const input = [
      activity(10),
      activity(-30),
      activity(-60, 0),
      activity(0, 0),
      activity(20, 10),
      { ...activity(0), end: new Date(NaN) },
    ];
    expect(getUpcomingActivities(input, now, 5).map((item) => item.id)).toEqual(
      ["-30", "10"],
    );
    expect(input[0].id).toBe("10");
  });
  it("does not let all-day reminders hide timed activities or their status", () => {
    const reminders = Array.from({ length: 5 }, (_, index) => ({
      ...activity(-720, 720),
      id: `reminder-${index}`,
      allDay: true,
    }));
    const upcoming = getUpcomingActivities(
      [...reminders, activity(-30), activity(60)],
      now,
      5,
    );
    expect(upcoming[0].id).toBe("-30");
    expect(upcoming[1].id).toBe("60");
    expect(getActivityStatus(upcoming[0], now)).toBe("In process");
    expect(upcoming).toHaveLength(5);
  });
  it("limits calendar and sport lists to five and three", () => {
    const input = Array.from({ length: 8 }, (_, index) => activity(index * 10));
    expect(getUpcomingActivities(input, now, 5)).toHaveLength(5);
    expect(getUpcomingActivities(input, now, 3)).toHaveLength(3);
  });
});

describe("live activity status", () => {
  it("transitions exactly at start and end", () => {
    const item = activity(43);
    expect(getActivityStatus(item, now)).toBe("Starts in 43 min");
    expect(getActivityStatus(item, item.start.getTime())).toBe("In process");
    expect(getActivityStatus(item, item.end.getTime())).toBe("Finished");
  });
  it("rounds up short waits and formats hours and days", () => {
    expect(getActivityStatus(activity(0.01), now)).toBe("Starts in 1 min");
    expect(getActivityStatus(activity(60), now)).toBe("Starts in 1 h");
    expect(getActivityStatus(activity(130), now)).toBe("Starts in 2 h 10 min");
    expect(getActivityStatus(activity(1500), now)).toBe("Starts in 1 d 1 h");
  });
  it("handles all-day activities explicitly", () => {
    const item = { ...activity(-30), allDay: true };
    expect(getActivityStatus(item, now)).toBe("All day");
    expect(formatActivityTime(item)).toBe("All day");
  });
  it("formats time as start–end even when activities cross midnight", () => {
    const item = {
      ...activity(0),
      start: new Date(2026, 0, 10, 23),
      end: new Date(2026, 0, 11, 1),
    };
    expect(formatActivityTime(item)).toBe("23:00–01:00");
  });
});

describe("schedule day headers", () => {
  it("formats ordinal numbers accurately", async () => {
    const { getOrdinalSuffix } = await import("./activities.ts");
    expect(getOrdinalSuffix(1)).toBe("1st");
    expect(getOrdinalSuffix(2)).toBe("2nd");
    expect(getOrdinalSuffix(3)).toBe("3rd");
    expect(getOrdinalSuffix(4)).toBe("4th");
    expect(getOrdinalSuffix(11)).toBe("11th");
    expect(getOrdinalSuffix(12)).toBe("12th");
    expect(getOrdinalSuffix(13)).toBe("13th");
    expect(getOrdinalSuffix(21)).toBe("21st");
    expect(getOrdinalSuffix(22)).toBe("22nd");
    expect(getOrdinalSuffix(23)).toBe("23rd");
    expect(getOrdinalSuffix(24)).toBe("24th");
    expect(getOrdinalSuffix(31)).toBe("31st");
  });

  it("formats Today, Tomorrow and other day headers with full month and ordinal", async () => {
    const { formatScheduleDayHeader } = await import("./activities.ts");
    const testNow = new Date(2026, 6, 24, 12).getTime(); // Monday, July 24, 2026
    const todayDate = new Date(2026, 6, 24, 15);
    const tomorrowDate = new Date(2026, 6, 25, 10);
    const futureDate = new Date(2026, 6, 26, 10);

    expect(formatScheduleDayHeader(todayDate, testNow)).toBe(
      "Today, Fri, 24th of July",
    );
    expect(formatScheduleDayHeader(tomorrowDate, testNow)).toBe(
      "Tomorrow, Sat, 25th of July",
    );
    expect(formatScheduleDayHeader(futureDate, testNow)).toBe(
      "Sun, 26th of July",
    );
  });
});
