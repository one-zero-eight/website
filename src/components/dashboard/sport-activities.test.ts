import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { describe, expect, it } from "vitest";
import { getUpcomingActivities } from "./activities.ts";
import {
  getSportCalendarRange,
  normalizeSportActivities,
} from "./sport-activities.ts";

const now = new Date("2026-06-15T10:00:00+03:00").getTime();
function training(
  id: number,
  checkedIn: boolean,
  startOffset = 0,
): SchemaTrainingInfoPersonalSchema {
  return {
    training: {
      id,
      start: new Date(now + startOffset * 60_000).toISOString(),
      end: new Date(now + (startOffset + 60) * 60_000).toISOString(),
      is_all_day: false,
      training_location: { id: 1, name: "Sport complex" },
      display_name: `Training ${id}`,
      sport_name: null,
      group_name: null,
      training_custom_name: null,
      is_accredited: false,
      is_club: false,
      is_paid: false,
      sport_id: null,
      group_id: 1,
      checkins_count: 0,
      max_checkins: 10,
    },
    checked_in: checkedIn,
    can_check_in: true,
    can_grade: false,
    can_edit: false,
  };
}

describe("sport calendar adapter", () => {
  it("maps only checked-in trainings to dashboard activities", () => {
    const activities = normalizeSportActivities([
      training(1, true),
      training(2, false),
    ]);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      id: "1",
      title: "Training 1",
      location: "Sport complex",
    });
    expect(activities[0].start.getTime()).toBe(now);
  });

  it("accepts empty lists and nullable locations", () => {
    expect(normalizeSportActivities([])).toEqual([]);
    const [activity] = normalizeSportActivities([
      {
        ...training(1, true),
        training: { ...training(1, true).training, training_location: null },
      },
    ]);
    expect(activity.location).toBeUndefined();
  });

  it("excludes ended sessions, keeps ongoing ones and limits checked-in list to three", () => {
    const response = [
      training(1, true, 180),
      training(2, true, -30),
      training(3, true, -60),
      training(4, true, 120),
      training(5, false),
      training(6, true, 60),
    ];
    expect(
      getUpcomingActivities(normalizeSportActivities(response), now, 3).map(
        (item) => item.id,
      ),
    ).toEqual(["2", "6", "4"]);
  });
});

describe("sport query range", () => {
  it("retains an overnight check-in when the backend marks only starts in range", () => {
    const time = new Date(2026, 5, 16, 0, 10).getTime();
    const start = new Date(2026, 5, 15, 23, 30);
    const end = new Date(2026, 5, 16, 0, 30);
    const range = getSportCalendarRange(time);
    const response = [
      {
        ...training(1, true),
        training: {
          ...training(1, true).training,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        checked_in:
          start >= new Date(range.start) && start <= new Date(range.end),
      },
    ];
    expect(
      getUpcomingActivities(normalizeSportActivities(response), time, 3),
    ).toHaveLength(1);
  });

  it("is stable within a local day and includes earlier starts for ongoing check-ins", () => {
    const time = new Date(2026, 5, 15, 14).getTime();
    const range = getSportCalendarRange(time);
    expect(range).toEqual(getSportCalendarRange(time + 60_000));
    expect(new Date(range.start)).toEqual(new Date(2026, 5, 14));
    expect(new Date(range.end)).toEqual(new Date(2026, 5, 22));
    expect(
      getSportCalendarRange(new Date(2026, 5, 16).getTime()).start,
    ).not.toBe(range.start);
  });
});
