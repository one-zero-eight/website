import { describe, expect, it } from "vitest";
import {
  instructorAssignedMeetings,
  resolveTimetableInstructor,
} from "./instructorDetails.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const instructors = [
  {
    id: "teacher-a",
    name_en: "Same Name",
    email: "a@uni.test",
    alias: "alice",
  },
  { id: "teacher-b", name_en: "Same Name", email: "b@uni.test" },
];
function meeting(
  id: string,
  assignments: string | string[],
  cancelled = false,
): Meeting {
  return {
    instance_id: id,
    course: "Math",
    tag: "lec",
    groups: ["G1"],
    date: "2026-09-08",
    start: "09:00",
    end: "10:30",
    room: "101",
    instructors: assignments,
    section: "core",
    cancelled,
  };
}

describe("instructor detail identity and assignments", () => {
  it("prefers exact IDs and resolves unique contacts without merging ambiguous names", () => {
    expect(resolveTimetableInstructor(instructors, "teacher-a")?.id).toBe(
      "teacher-a",
    );
    expect(resolveTimetableInstructor(instructors, " A@UNI.TEST ")?.id).toBe(
      "teacher-a",
    );
    expect(resolveTimetableInstructor(instructors, "alice")?.id).toBe(
      "teacher-a",
    );
    expect(
      resolveTimetableInstructor(instructors, "Same Name"),
    ).toBeUndefined();
  });
  it("includes co-teaching, excludes cancelled and substituted occurrences", () => {
    const meetings = [
      meeting("base", "teacher-a"),
      meeting("substitute", "teacher-b"),
      meeting("joint", ["teacher-b", "a@uni.test"]),
      meeting("cancelled", "teacher-a", true),
      meeting("ambiguous", "Same Name"),
    ];
    expect(
      instructorAssignedMeetings(instructors, meetings, "teacher-a").map(
        (item) => item.instance_id,
      ),
    ).toEqual(["base", "joint"]);
  });
  it("can show unresolved assignments without attributing them to a different instructor", () => {
    expect(
      instructorAssignedMeetings(
        instructors,
        [meeting("unknown", "Guest")],
        "Guest",
      ),
    ).toHaveLength(1);
    expect(
      instructorAssignedMeetings(
        instructors,
        [meeting("unknown", "Guest")],
        "teacher-a",
      ),
    ).toEqual([]);
  });
});
