import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { matchesCourseBlockFilter } from "./courseBlockFilter.ts";
import { CourseBlocksEditor } from "./CourseBlocksEditor.tsx";
import { BlockFilter } from "@/components/schedule-assistant/BlockFilter.tsx";
import { buildCoursesTabSections } from "./coursesTabSections.ts";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";

const blocks = [
  {
    id: "b",
    name: "Вторая половина",
    start_date: "2026-09-16",
    end_date: "2026-09-30",
  },
  {
    id: "a",
    name: "Первая половина",
    start_date: "2026-09-01",
    end_date: "2026-09-15",
  },
];

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("course block filter", () => {
  it("includes full-semester courses in every block but not explicit blocks in full-semester mode", () => {
    expect(matchesCourseBlockFilter(null, "a")).toBe(true);
    expect(matchesCourseBlockFilter(["a"], "a")).toBe(true);
    expect(matchesCourseBlockFilter(["a"], "b")).toBe(false);
    expect(matchesCourseBlockFilter(["a"], "semester")).toBe(false);
    expect(matchesCourseBlockFilter(null, "semester")).toBe(true);
    expect(matchesCourseBlockFilter([], "all")).toBe(true);
  });

  it("preserves original course indices and empty sections under filtering", () => {
    const config = {
      term: {
        blocks,
        sections: [{ code: "main", name: "Main", programs: [] }],
      },
      courses: [
        {
          name: "Only second",
          section_code: "main",
          blocks: ["b"],
          components: [],
        },
        {
          name: "Full semester",
          section_code: "main",
          blocks: null,
          components: [],
        },
        {
          name: "Only first",
          section_code: "main",
          blocks: ["a"],
          components: [],
        },
      ],
      students_groups: [],
    } as unknown as SchemaScheduleConfig;
    const section = buildCoursesTabSections(config, "a").sections[0];
    expect(section.looseCourses.map((row) => row.courseIndex).sort()).toEqual([
      1, 2,
    ]);
    expect(
      section.looseCourses.find((row) => row.courseIndex === 1)?.blockLabels,
    ).toEqual(["Весь семестр"]);
    expect(
      buildCoursesTabSections({ ...config, courses: [] }, "a").sections[0].key,
    ).toBe("main");
  });

  it("renders chronological choices and reports selected filter", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(BlockFilter, { blocks, value: "all", onChange }),
      ),
    );
    const select = container.querySelector("select")!;
    expect([...select.options].map((option) => option.value)).toEqual([
      "all",
      "semester",
      "a",
      "b",
    ]);
    await act(async () => {
      select.value = "a";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("a");
    await act(async () => root.unmount());
  });

  it("selects explicit blocks and returns to null when removing the last selection", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(CourseBlocksEditor, {
          blocks,
          value: null,
          onChange,
          disabled: false,
        }),
      ),
    );
    await act(async () =>
      container.querySelectorAll<HTMLInputElement>("input")[1].click(),
    );
    expect(onChange).toHaveBeenLastCalledWith(["a"]);
    await act(async () =>
      root.render(
        createElement(CourseBlocksEditor, {
          blocks,
          value: ["a"],
          onChange,
          disabled: false,
        }),
      ),
    );
    await act(async () =>
      container.querySelectorAll<HTMLInputElement>("input")[1].click(),
    );
    expect(onChange).toHaveBeenLastCalledWith(null);
    await act(async () => root.unmount());
  });
});
