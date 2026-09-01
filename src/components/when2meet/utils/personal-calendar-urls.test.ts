import { scheduleTypes } from "@/api/schedule";
import { describe, expect, it } from "vitest";
import { getPersonalCalendarIcsUrls } from "./personal-calendar-urls.ts";

describe("getPersonalCalendarIcsUrls", () => {
  it("uses aliases for virtual groups and excludes hidden aliases", () => {
    const eventGroups: scheduleTypes.SchemaListEventGroupsResponse = {
      event_groups: [
        {
          id: 42,
          alias: "b26-se",
          name: "B26-SE",
          tags: [],
          virtual: false,
        },
        {
          alias: "elective-b26-se",
          name: "B26-SE Elective",
          tags: [],
          virtual: true,
        },
      ],
    };

    const urls = getPersonalCalendarIcsUrls({
      favorites: ["elective-b26-se", "b26-se"],
      hidden: ["b26-se"],
      predefined: ["elective-b26-se"],
      eventGroups,
      userId: 108,
      musicRoomHidden: true,
      sportsHidden: true,
      moodleHidden: true,
    });

    expect(urls.some((url) => url.includes("/b26-se.ics"))).toBe(false);
    expect(
      urls.filter((url) => url.includes("/elective-b26-se.ics")),
    ).toHaveLength(1);
  });
});
