import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TimetableWeekBlockLabel } from "./TimetableBlockNavigation.tsx";
import { renderToStaticMarkup } from "react-dom/server";

const blocks = [
  {
    id: "first",
    name: "Первый блок",
    start_date: "2026-09-01",
    end_date: "2026-09-15",
  },
  {
    id: "second",
    name: "Второй блок",
    start_date: "2026-09-16",
    end_date: "2026-09-30",
  },
];
const weeks = [
  { key: "2026-08-31", start: "2026-08-31", end: "2026-09-06" },
  { key: "2026-09-07", start: "2026-09-07", end: "2026-09-13" },
  { key: "2026-09-14", start: "2026-09-14", end: "2026-09-20" },
];

describe("TimetableWeekBlockLabel", () => {
  it.each([
    [weeks[0], "Первый блок"],
    [weeks[1], "Первый блок"],
    [weeks[2], "Первый блок / Второй блок"],
    [
      { key: "2026-09-21", start: "2026-09-21", end: "2026-09-27" },
      "Второй блок",
    ],
  ])(
    "labels the selected week instead of individual events (%j)",
    (week, label) => {
      const html = renderToStaticMarkup(
        createElement(TimetableWeekBlockLabel, { blocks, week }),
      );
      expect(html).toContain(label);
      expect(html).not.toContain("button");
    },
  );

  it("does not show a label outside blocks, without weeks, or without blocks", () => {
    for (const props of [
      { blocks, week: undefined },
      { blocks: [], week: weeks[0] },
      {
        blocks,
        week: { key: "2026-10-05", start: "2026-10-05", end: "2026-10-11" },
      },
    ]) {
      expect(
        renderToStaticMarkup(createElement(TimetableWeekBlockLabel, props)),
      ).toBe("");
    }
  });
});
