import { describe, expect, it } from "vitest";
import {
  getCalendarSources,
  type CalendarSelection,
} from "./calendar-sources.ts";

const user: CalendarSelection = {
  id: 123,
  favorite_event_groups: ["group-1", "group-2", "missing"],
  hidden_event_groups: ["group-2"],
  music_room_hidden: false,
  sports_hidden: false,
  moodle_hidden: false,
  linked_calendars: {
    active: {
      id: 1,
      user_id: 123,
      alias: "active",
      url: "https://example.com/active.ics",
      is_active: true,
    },
    inactive: {
      id: 2,
      user_id: 123,
      alias: "inactive",
      url: "https://example.com/inactive.ics",
      is_active: false,
    },
  },
};
const groups = {
  event_groups: [1, 2, 3].map((id) => ({
    id,
    alias: `group-${id}`,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    virtual: false,
  })),
};

describe("shared calendar source selection", () => {
  it("combines favorites/predefined uniquely, removes hidden/unknown groups, and includes active imports/personal feeds", () => {
    const result = getCalendarSources(
      user,
      ["group-1", "group-2", "group-3"],
      groups,
    );
    expect(result.map((source) => source.id)).toEqual([
      "group:group-1",
      "group:group-3",
      "music-room",
      "sport",
      "moodle",
      "events",
      "room-bookings",
      "imported:active",
    ]);
    expect(result[0]).toMatchObject({
      userId: 123,
      group: { alias: "group-1" },
    });
    expect(result.at(-1)).toMatchObject({
      userId: 123,
      calendar: { alias: "active" },
    });
  });

  it("excludes sport only for dashboard without changing other selected sources", () => {
    const full = getCalendarSources(user, ["group-3"], groups);
    const dashboard = getCalendarSources(user, ["group-3"], groups, {
      excludeSport: true,
    });
    expect(dashboard).toEqual(full.filter((source) => source.kind !== "sport"));
  });

  it("respects hidden personal feeds but always includes events and bookings", () => {
    const result = getCalendarSources(
      {
        ...user,
        favorite_event_groups: [],
        music_room_hidden: true,
        sports_hidden: true,
        moodle_hidden: true,
        linked_calendars: null,
      },
      [],
      groups,
    );
    expect(result.map((source) => source.id)).toEqual([
      "events",
      "room-bookings",
    ]);
  });
});
