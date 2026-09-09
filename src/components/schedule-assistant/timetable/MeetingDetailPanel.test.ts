import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { MeetingDetailPanel } from "./MeetingDetailPanel.tsx";
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
  courses: [
    {
      name: "Math",
      section_code: "core",
      instructors: [],
      components: [{ tag: "lec", audience: [], sessions: [] }],
    },
  ],
  instructors: [],
  rooms: [],
  students_groups: [],
};
const meeting: Meeting = {
  instance_id: "0:0:0:occ:0",
  course: "Math",
  tag: "lec",
  date: "2026-09-07",
  start: "09:00",
  end: "10:30",
  room: "101",
  groups: [],
  instructors: [],
  section: "core",
  notes: "Bring a laptop\n<script>alert(1)</script>",
};

describe("public meeting details", () => {
  it("renders without a query provider or editor and safely displays full notes", () => {
    const html = renderToStaticMarkup(
      createElement(MeetingDetailPanel, {
        config,
        meeting,
        allMeetings: [meeting],
        onNavigateToMeeting: () => {},
      }),
    );
    expect(html).toContain("Bring a laptop");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("Редактировать");
    expect(html).toContain("Компоненты курса");
  });
});
