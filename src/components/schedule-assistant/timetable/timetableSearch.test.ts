import { describe, expect, it } from "vitest";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

const config = {
  term: {
    sections: [
      {
        code: "core",
        programs: [
          {
            code: "BS",
            name: "Bachelor",
            tracks: [
              {
                code: "CSE",
                name: "Computer Science",
                groups: ["B26-CSE-01", "B26-CSE-02"],
              },
              {
                code: "AI",
                name: "Artificial Intelligence",
                groups: ["B26-AI-01", "B26-AI-02"],
              },
            ],
          },
        ],
      },
    ],
  },
} as unknown as SchemaScheduleConfig;
import {
  buildTimetableSearchEntries,
  parseTimetableSearchQuery,
  searchTimetableEntries,
} from "./timetableSearch.ts";
import type { Meeting } from "./timetableViewerModel.ts";

function meeting(date: string, overrides: Partial<Meeting> = {}): Meeting {
  return {
    instance_id: `0:0:0:wp:0:${date}`,
    course: "Mathematical Analysis",
    tag: "lab",
    date,
    start: "09:00",
    end: "10:30",
    room: "101",
    groups: ["B26-CSE-01"],
    instructors: ["instructor"],
    instructor_pool: [],
    section: "core",
    ...overrides,
  };
}
function search(
  meetings: Meeting[],
  query = "Mathematical",
  activeDate = "2026-09-07",
) {
  return searchTimetableEntries(
    buildTimetableSearchEntries(meetings, { instructor: "Alex Smith" }, config),
    query,
    activeDate,
  );
}

describe("timetable series search", () => {
  it.each([
    [1, ["январь", "января", "янв"]],
    [2, ["февраль", "февраля", "фев", "февр"]],
    [3, ["март", "марта", "мар"]],
    [4, ["апрель", "апреля", "апр"]],
    [5, ["май", "мая"]],
    [6, ["июнь", "июня", "июн"]],
    [7, ["июль", "июля", "июл"]],
    [8, ["август", "августа", "авг"]],
    [9, ["сентябрь", "сентября", "сен", "сент"]],
    [10, ["октябрь", "октября", "окт"]],
    [11, ["ноябрь", "ноября", "ноя", "нояб"]],
    [12, ["декабрь", "декабря", "дек"]],
  ] as const)(
    "recognizes names and abbreviations for month %i",
    (month, aliases) => {
      const entry = meeting(`2026-${String(month).padStart(2, "0")}-24`);
      for (const alias of aliases) {
        for (const suffix of ["", ".", " 2026", ". 2026"]) {
          const query = `Mathematical 24 ${alias.toUpperCase()}${suffix}`;
          const result = search([entry], query);
          expect(result, query).toHaveLength(1);
          expect(result[0].isSeries).toBe(false);
          expect(parseTimetableSearchQuery(query).words).toEqual([
            "mathematical",
          ]);
        }
      }
    },
  );
  it("does not recognize a month prefix inside another word", () => {
    expect(parseTimetableSearchQuery("24 августовский").date).toBeUndefined();
  });
  it.each([
    { groups: ["B26-CSE-01", "B26-CSE-02"], label: "Computer Science" },
    {
      groups: ["B26-CSE-01", "B26-CSE-02", "B26-AI-01", "B26-AI-02"],
      label: "Bachelor",
    },
  ])(
    "collapses complete audiences to $label while retaining group search",
    ({ groups, label }) => {
      const result = search(
        [meeting("2026-09-07", { groups })],
        "Mathematical CSE-01",
      );
      expect(result).toHaveLength(1);
      expect(result[0].entry.details).toContain(label);
      expect(result[0].entry.details).not.toContain("B26-CSE-01");
      expect(search([meeting("2026-09-07", { groups })], label)).toHaveLength(
        1,
      );
    },
  );
  it("retains individual groups for partial audiences", () => {
    expect(search([meeting("2026-09-07")])[0].entry.details).toContain(
      "B26-CSE-01",
    );
  });
  it("groups weekly occurrences and chooses the displayed week's event", () => {
    const result = search([
      meeting("2026-09-14"),
      meeting("2026-08-31"),
      meeting("2026-09-07"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].isSeries).toBe(true);
    expect(result[0].occurrences).toHaveLength(3);
    expect(result[0].entry.meeting.date).toBe("2026-09-07");
  });
  it("chooses the next occurrence or the last when the series ended", () => {
    const meetings = [meeting("2026-08-31"), meeting("2026-09-14")];
    expect(search(meetings)[0].entry.meeting.date).toBe("2026-09-14");
    expect(
      search(meetings, "Mathematical", "2026-12-01")[0].entry.meeting.date,
    ).toBe("2026-09-14");
  });
  it("keeps distinct slots and audiences separate", () => {
    const result = search([
      meeting("2026-09-07"),
      meeting("2026-09-14"),
      meeting("2026-09-07", { instance_id: "0:0:0:wp:1:2026-09-07" }),
      meeting("2026-09-07", {
        instance_id: "0:0:1:wp:0:2026-09-07",
        groups: ["B26-CSE-02"],
      }),
    ]);
    expect(result).toHaveLength(3);
  });
  it("ranks group-specific labs above shared lectures", () => {
    const lecture = meeting("2026-08-31", {
      instance_id: "0:1:0:wp:0:2026-08-31",
      tag: "lec",
      groups: ["B26-CSE-01", "B26-CSE-02"],
    });
    expect(
      search([lecture, meeting("2026-09-07")], "Mathematical CSE-01")[0].entry
        .meeting.tag,
    ).toBe("lab");
  });
  it.each(["07.09", "7.9.2026", "2026-09-07", "7 сентября", "7 сентября 2026"])(
    "finds concrete dates with %s",
    (date) => {
      const result = search(
        [meeting("2026-09-07"), meeting("2026-09-14")],
        `Mathematical ${date}`,
      );
      expect(result).toHaveLength(1);
      expect(result[0].isSeries).toBe(false);
      expect(result[0].entry.meeting.date).toBe("2026-09-07");
    },
  );
  it("matches yearless dates across the loaded semester, respecting explicit years", () => {
    expect(search([meeting("2027-01-04")], "04.01")).toHaveLength(1);
    expect(search([meeting("2027-01-04")], "04.01.2026")).toHaveLength(0);
  });
  it("does not normalize invalid dates into valid ones", () => {
    expect(search([meeting("2026-03-03")], "31.02")).toHaveLength(0);
  });
  it("filters series by actual weekday", () => {
    expect(
      search(
        [meeting("2026-09-07"), meeting("2026-09-14")],
        "Mathematical понедельник",
      )[0].occurrences,
    ).toHaveLength(2);
    expect(search([meeting("2026-09-07")], "вторник")).toHaveLength(0);
  });
  it("keeps moved events in their original series and searches actual dates", () => {
    const moved = meeting("2026-09-08", {
      instance_id: "0:0:0:wp:0:2026-09-07",
      pattern_date: "2026-09-07",
      override_fields: ["weekday", "room"],
    });
    expect(search([moved, meeting("2026-09-14")])[0].occurrences).toHaveLength(
      2,
    );
    expect(search([moved], "07.09")).toHaveLength(0);
    expect(search([moved], "08.09")[0].entry.meeting.override_fields).toEqual([
      "weekday",
      "room",
    ]);
  });
  it("excludes cancelled events and preserves one-off occurrences", () => {
    const result = search([
      meeting("2026-09-07", { cancelled: true }),
      meeting("2026-09-14", { instance_id: "0:0:0:occ:0" }),
      meeting("2026-09-21", { instance_id: "0:0:0:occ:1" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((item) => !item.isSeries)).toBe(true);
  });
  it("does not implement relative dates", () => {
    expect(parseTimetableSearchQuery("сегодня").date).toBeUndefined();
    expect(
      search([meeting("2026-09-07")], "следующий понедельник"),
    ).toHaveLength(0);
    expect(search([meeting("2026-09-07")], "")).toHaveLength(0);
  });
});
