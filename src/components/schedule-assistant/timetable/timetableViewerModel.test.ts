import { describe, expect, it } from "vitest";

import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import {
  buildColumns,
  columnsForTab,
  compactGroupRows,
  type Meeting,
} from "./timetableViewerModel";

describe("timetable group columns", () => {
  it("keeps configured groups without meetings visible", () => {
    const config = {
      term: {
        sections: [
          {
            code: "core",
            name: "Core",
            programs: [
              {
                code: "MS_Y1",
                name: "MS - Year 1",
                tracks: [
                  {
                    code: "SE",
                    name: "Software Engineering",
                    groups: ["M26-SE-01"],
                  },
                  {
                    code: "TE",
                    name: "Technological Entrepreneurship",
                    groups: ["M26-TE-01"],
                  },
                ],
              },
            ],
          },
        ],
      },
      students_groups: [
        {
          code: "M26-SE-01",
          name: "M26-SE-01",
          estimated_size: 32,
          students: [],
        },
        {
          code: "M26-TE-01",
          name: "M26-TE-01",
          estimated_size: 18,
          students: [],
        },
      ],
      courses: [
        {
          name: "Software Engineering",
          section_code: "core",
          components: [
            {
              tag: "lec",
              audience: ["M26-SE-01"],
            },
          ],
        },
      ],
    } as unknown as SchemaScheduleConfig;

    const columns = buildColumns(config);

    expect(columns.map((column) => column.groupId)).toEqual([
      "M26-SE-01",
      "M26-TE-01",
    ]);
    expect(
      columnsForTab("core", columns, [], config).map(
        (column) => column.groupId,
      ),
    ).toEqual(["M26-SE-01", "M26-TE-01"]);
  });

  it("preserves English group order from the config", () => {
    const config = {
      term: {
        sections: [
          {
            code: "english",
            name: "English",
            programs: [
              {
                code: "ENGLISH_YEAR1",
                name: "English",
                tracks: [
                  {
                    code: "AWA_I",
                    name: "AWA-I",
                    groups: ["AWA-I-2", "AWA-I-1", "AWA-I-10"],
                  },
                ],
              },
            ],
          },
        ],
      },
      students_groups: [
        { code: "AWA-I-1", name: "AWA-I-1" },
        { code: "AWA-I-2", name: "AWA-I-2" },
        { code: "AWA-I-10", name: "AWA-I-10" },
      ],
      courses: [],
    } as unknown as SchemaScheduleConfig;

    const columns = buildColumns(config);

    expect(
      columnsForTab("english", columns, [], config).map(
        (column) => column.groupId,
      ),
    ).toEqual(["AWA-I-2", "AWA-I-1", "AWA-I-10"]);
  });
});

describe("compact group rows", () => {
  const config = {
    term: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      time_slots: [
        { start_time: "09:00", end_time: "10:30" },
        { start_time: "10:40", end_time: "12:10" },
        { start_time: "12:40", end_time: "14:10" },
      ],
    },
  } as unknown as SchemaScheduleConfig;
  const columns = [
    {
      yearLabel: "Program",
      groupId: "G1",
      groupLabel: "G1",
    },
    {
      yearLabel: "Program",
      groupId: "G2",
      groupLabel: "G2",
    },
  ];
  const meeting = (
    overrides: Partial<Meeting> & Pick<Meeting, "date" | "start">,
  ): Meeting => ({
    instance_id: `${overrides.date}:${overrides.start}`,
    course: "Course",
    tag: "lec",
    groups: ["G1"],
    room: "",
    instructors: [],
    instructor_pool: [],
    section: "core",
    ...overrides,
  });

  it("keeps only weekday/time pairs used by the section across all weeks", () => {
    const rows = compactGroupRows(
      config,
      [
        meeting({ date: "2026-09-07", start: "09:00" }),
        meeting({ date: "2026-09-16", start: "12:40" }),
        meeting({
          date: "2026-09-08",
          start: "10:40",
          section: "electives",
        }),
      ],
      "core",
      columns,
    );

    expect(rows).toEqual([
      { day: "Mon", slotStart: "09:00" },
      { day: "Wed", slotStart: "12:40" },
    ]);
  });

  it("keeps configured columns independent from compact row usage", () => {
    const rows = compactGroupRows(
      config,
      [meeting({ date: "2026-09-07", start: "09:00", groups: ["G1"] })],
      "core",
      columns,
    );

    expect(columns.map((column) => column.groupId)).toEqual(["G1", "G2"]);
    expect(rows).toEqual([{ day: "Mon", slotStart: "09:00" }]);
  });
});
