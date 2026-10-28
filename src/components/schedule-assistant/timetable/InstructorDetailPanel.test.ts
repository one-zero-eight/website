import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { InstructorDetailPanel } from "./InstructorDetailPanel.tsx";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";
import type { Meeting } from "./timetableViewerModel.ts";

const config: TimetableViewConfig = {
  term: {
    name: "Fall",
    semester: { start_date: "2026-09-01", end_date: "2026-12-31" },
    days: [Weekday.MONDAY],
    starting_day: Weekday.MONDAY,
    time_slots: [],
    sections: [],
  },
  courses: [],
  instructors: [
    {
      id: "teacher",
      name_en: "Alice",
      name_ru: "Алиса",
      position: "Professor",
      email: "alice@uni.test",
      alias: "alice",
    },
  ],
  rooms: [],
  students_groups: [],
};
function renderPanel(instructorId: string) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { i18n },
      createElement(InstructorDetailPanel, {
        instructorId,
        config,
        allMeetings: [meeting],
        onNavigateToMeeting: () => {},
      }),
    ),
  );
}
const meeting: Meeting = {
  instance_id: "0:0:0:occ:0",
  course: "Math",
  tag: "lec",
  date: "2026-09-07",
  start: "09:00",
  end: "10:30",
  room: "101",
  groups: ["G1"],
  instructors: ["teacher"],
  section: "core",
};

describe("public instructor details", () => {
  it("shows public profile and scheduled classes without private queries", () => {
    const html = renderPanel("teacher");
    for (const value of [
      "Alice",
      "Алиса",
      "Professor",
      "mailto:alice@uni.test",
      "Math",
      "G1",
      "101",
      "1 class",
    ])
      expect(html).toContain(value);
    expect(html).not.toContain("Edit");
  });
  it("shows an empty state rather than another teacher's classes", () => {
    const html = renderPanel("other");
    expect(html).toContain("No assigned classes.");
    expect(html).not.toContain("Math");
  });
});
