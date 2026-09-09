import { describe, expect, it } from "vitest";
import {
  Weekday,
  type SchemaPublicTimetable,
} from "@/api/schedule-assistant/types.ts";
import { publicTimetableConfig } from "./publicTimetableConfig.ts";
import {
  nearestPersonalMeeting,
  personalTimetableGroups,
  shouldAutoNavigatePersonalGroups,
} from "./timetablePersonalization.ts";
import {
  createSelectionStore,
  meetingHighlightBits,
} from "./timetableSelectionStore.ts";
import { buildMeetings, type Meeting } from "./timetableViewerModel.ts";

const publicData: SchemaPublicTimetable = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-12-31" },
    days: [Weekday.MONDAY],
    starting_day: Weekday.MONDAY,
    time_slots: [{ start_time: "09:00:00", end_time: "10:30:00" }],
    sections: [
      {
        code: "core",
        name: "Core",
        programs: [{ code: "BS", name: "BS", groups: ["B", "A"] }],
      },
    ],
  },
  students_groups: [{ code: "A", name: "Group A" }],
  courses: [
    {
      name: "Math",
      section_code: "core",
      components: [
        {
          tag: "lec",
          audience: ["B"],
          sessions: [
            {
              audience: ["B"],
              notes: "Bring a laptop",
              dates_pattern: [
                {
                  date: "2026-09-07",
                  start_time: "09:00:00",
                  end_time: "10:30:00",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
const config = publicTimetableConfig(publicData);
const meeting: Meeting = {
  instance_id: "a",
  course: "Math",
  tag: "lec",
  groups: ["B"],
  date: "2026-09-07",
  start: "09:00",
  end: "10:30",
  room: "101",
  instructors: "teacher",
  section: "core",
};

describe("public timetable display data", () => {
  it("builds meetings without any private config fields", () => {
    const meetings = buildMeetings(config);
    expect(meetings).toHaveLength(1);
    expect(meetings[0].notes).toBe("Bring a laptop");
    expect(meetings[0]).not.toHaveProperty("instructor_pool");
    expect(config.students_groups?.[0]).not.toHaveProperty("students");
    expect(config.courses?.[0].components[0]).not.toHaveProperty(
      "instructor_pool",
    );
  });
});

describe("personal timetable navigation", () => {
  it("orders own groups by timetable hierarchy and ignores unknown ids", () => {
    expect(
      personalTimetableGroups(config, ["A", "unknown", "B", "B"]).map(
        (group) => [group.groupId, group.label],
      ),
    ).toEqual([
      ["B", "B"],
      ["A", "Group A"],
    ]);
  });
  it("prefers a current-week meeting, ignores cancellations and other groups", () => {
    const group = personalTimetableGroups(config, ["B"])[0];
    const current = { ...meeting, date: "2026-09-11" };
    expect(
      nearestPersonalMeeting(
        [
          { ...meeting, cancelled: true, date: "2026-09-09" },
          { ...meeting, groups: ["A"], date: "2026-09-09" },
          { ...meeting, date: "2026-09-14" },
          current,
        ],
        group,
        "2026-09-09",
      ),
    ).toBe(current);
  });
  it("chooses the nearest available week when this week is empty", () => {
    const group = personalTimetableGroups(config, ["B"])[0];
    const next = { ...meeting, date: "2026-09-14" };
    expect(
      nearestPersonalMeeting(
        [{ ...meeting, date: "2026-08-31" }, next],
        group,
        "2026-09-09",
      ),
    ).toBe(next);
  });
  it("auto-navigates once, after readiness, without overriding users or deep links", () => {
    const options = {
      ready: true,
      handled: false,
      userNavigated: false,
      groups: personalTimetableGroups(config, ["B"]),
    };
    expect(shouldAutoNavigatePersonalGroups(options)).toBe(true);
    for (const override of [
      { ready: false },
      { handled: true },
      { userNavigated: true },
      { focusMeetingId: "a" },
      { groups: [] },
    ]) {
      expect(
        shouldAutoNavigatePersonalGroups({ ...options, ...override }),
      ).toBe(false);
    }
  });
});

describe("independent personal highlighting", () => {
  it("retains personal marks through selections and clears them on sign-out", () => {
    const store = createSelectionStore();
    store.setPersonalGroups(["B"]);
    expect(meetingHighlightBits(store, meeting)).toBe(4);
    store.setSelection({
      type: "meeting",
      value: "a",
      course: "Math",
      focusTag: "lec",
    });
    expect(meetingHighlightBits(store, meeting)).toBe(7);
    store.setSelection({ type: "group", value: "A" });
    expect(meetingHighlightBits(store, meeting)).toBe(4);
    store.setPersonalGroups([]);
    expect(meetingHighlightBits(store, meeting)).toBe(0);
    expect(store.getSelection()).toEqual({ type: "group", value: "A" });
  });
  it("does not highlight unrelated groups", () => {
    const store = createSelectionStore();
    store.setPersonalGroups(["A"]);
    expect(meetingHighlightBits(store, meeting)).toBe(0);
  });
});
