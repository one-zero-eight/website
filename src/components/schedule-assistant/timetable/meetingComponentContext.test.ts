import { describe, expect, it } from "vitest";

import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  listComponentSeriesDisplayItems,
  listComponentSeriesNavItemsForRef,
} from "./meetingComponentContext.ts";
import type { Meeting } from "./timetableViewerModel.ts";

describe("component series audience labels", () => {
  it.each([
    { tokens: ["@BS_Y1_RU/AI360"], groups: ["G1"], label: "Group 1 (G1)" },
    { tokens: ["@BS_Y1_RU"], groups: ["G1"], label: "Group 1 (G1)" },
    {
      tokens: ["@BS_Y1_RU/AI360"],
      groups: ["G1", "G2"],
      label: "@BS_Y1_RU/AI360",
    },
    { tokens: ["@BS_Y1_RU"], groups: ["G1", "G2"], label: "@BS_Y1_RU" },
    { tokens: ["@UNKNOWN"], groups: ["G1"], label: "@UNKNOWN" },
    { tokens: ["G1"], groups: ["G1"], label: "Group 1 (G1)" },
    {
      tokens: ["@BS_Y1_RU/AI360", "G1"],
      groups: ["G1"],
      label: "Group 1 (G1)",
    },
  ])("formats $tokens with $groups as $label", ({ tokens, groups, label }) => {
    const component = {
      tag: "lec",
      audience: tokens,
      sessions: [{ audience: tokens }],
    } as SchemaComponent;
    const config = {
      term: {
        sections: [
          {
            code: "core",
            programs: [
              {
                code: "BS_Y1_RU",
                tracks: [{ code: "AI360", groups }],
              },
            ],
          },
        ],
      },
      students_groups: [
        { code: "G1", name: "Group 1" },
        { code: "G2", name: "Group 2" },
      ],
      courses: [{ name: "Course", components: [component] }],
    } as unknown as SchemaScheduleConfig;
    const meeting: Meeting = {
      instance_id: "0:0:0:occ:0",
      course: "Course",
      tag: "lec",
      groups,
      date: "2026-09-04",
      start: "16:00",
      end: "17:30",
      room: "300",
      instructors: [],
      instructor_pool: [],
      section: "core",
    };

    expect(listComponentSeriesDisplayItems(config, component)[0]?.label).toBe(
      label,
    );
    const navItem = listComponentSeriesNavItemsForRef(
      config,
      [meeting],
      0,
      0,
      meeting,
    )[0];
    expect(navItem?.label).toBe(label);
    expect(navItem?.meeting).toBe(meeting);
    expect(component.sessions?.[0]?.audience).toEqual(tokens);
  });
});
