import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it } from "vitest";
import { CourseBlocksEditor } from "./CourseBlocksEditor.tsx";
import { buildCoursesTabSections } from "./coursesTabSections.ts";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

const blocks = [
  {
    id: "b",
    name: "Second half",
    start_date: "2026-09-16",
    end_date: "2026-09-30",
  },
  {
    id: "a",
    name: "First half",
    start_date: "2026-09-01",
    end_date: "2026-09-15",
  },
];
const config = {
  term: { blocks, sections: [{ code: "main", name: "Main", programs: [] }] },
  courses: [
    {
      name: "Only second",
      section_code: "main",
      components: [{ tag: "lec", sessions: [{ block_id: "b" }] }],
    },
    {
      name: "Full semester",
      section_code: "main",
      components: [{ tag: "lec", sessions: [{ block_id: null }] }],
    },
    {
      name: "Merged",
      section_code: "main",
      components: ["lec", "tut", "lab"].map((tag) => ({
        tag,
        sessions: [{ block_id: "a" }, { block_id: "b" }],
      })),
    },
  ],
  students_groups: [],
} as unknown as SchemaScheduleConfig;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("derived course blocks", () => {
  it("keeps three logical components with both series block badges", () => {
    const section = buildCoursesTabSections(config).sections[0];
    expect(section.looseCourses.map((row) => row.courseIndex).sort()).toEqual([
      0, 1, 2,
    ]);
    expect(
      section.looseCourses.find((row) => row.courseIndex === 1)?.blockSlots,
    ).toBeNull();
    const merged = section.looseCourses.find((row) => row.courseIndex === 2)!;
    expect(merged.subtitle).toBe("lec, tut, lab");
    expect(merged.blockSlots).toEqual([
      { name: "First half", present: true },
      { name: "Second half", present: true },
    ]);
    expect(
      section.looseCourses.find((row) => row.courseIndex === 0)?.blockSlots,
    ).toEqual([
      { name: "First half", present: false },
      { name: "Second half", present: true },
    ]);
    expect(
      buildCoursesTabSections({ ...config, courses: [] }).sections[0].key,
    ).toBe("main");
  });

  it("shows deduplicated read-only chips instead of course-level controls", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const i18n = setupI18n({ locale: "en", messages: {} });
    await act(async () =>
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(CourseBlocksEditor, {
            blocks,
            course: config.courses![2],
          }),
        ),
      ),
    );
    expect(container.querySelectorAll("button, input, select")).toHaveLength(0);
    expect(
      [...container.querySelectorAll(".badge")].map((chip) => chip.textContent),
    ).toEqual(["First half", "Second half"]);
    await act(async () => root.unmount());
  });
});
