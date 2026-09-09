import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { WeeklyAlternationFields } from "./sessionSeriesRows.tsx";

vi.mock("@/components/common/SelectDropdown.tsx", () => ({
  SelectDropdown: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) =>
    createElement(
      "select",
      {
        value,
        onChange: (event: { target: { value: string } }) =>
          onChange(event.target.value),
      },
      options.map((option) =>
        createElement(
          "option",
          { key: option.value, value: option.value },
          option.label,
        ),
      ),
    ),
}));
vi.mock("./DateInput.tsx", () => ({
  DateInput: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) =>
    createElement(
      "select",
      {
        "data-anchor": true,
        value,
        onChange: (event: { target: { value: string } }) =>
          onChange(event.target.value),
      },
      ["2026-08-31", "2026-09-07"].map((date) =>
        createElement("option", { key: date, value: date }, date),
      ),
    ),
}));

const config = {
  term: {
    semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
    starting_day: Weekday.MONDAY,
    days: [Weekday.TUESDAY],
    sections: [],
  },
  students_groups: [],
  courses: [],
} as unknown as SchemaScheduleConfig;

describe("weekly alternation editor", () => {
  it("toggles, previews, changes phase and reopens without dropping inactive edits", async () => {
    const original: SchemaWeeklyPatternSlot = {
      weekday: Weekday.TUESDAY,
      start_time: "09:00:00",
      end_time: "10:30:00",
      edits: [{ select_week: "2026-09-07", cancel: true }],
    };
    let saved = original;
    function Editor({ initial }: { initial: SchemaWeeklyPatternSlot }) {
      const [slot, setSlot] = useState(initial);
      return createElement(WeeklyAlternationFields, {
        config,
        slot,
        audienceTokens: [],
        onChange: (next) => {
          saved = next;
          setSlot(next);
        },
      });
    }
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    async function select(selector: string, value: string) {
      await act(async () => {
        const input = container.querySelector<HTMLSelectElement>(selector)!;
        input.value = value;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    try {
      await act(async () =>
        root.render(createElement(Editor, { initial: original })),
      );
      expect(container.textContent).toContain("Каждую неделю");
      expect(container.querySelector("[data-anchor]")).toBeNull();
      await select("select", "alternate");
      expect(saved.alternation).toEqual({ anchor_week: "2026-08-31" });
      expect(container.textContent).toContain("не начиная с этой даты");
      expect(container.textContent).toContain("неактивных недель (1)");
      expect(container.textContent).toContain("01.09");
      expect(container.textContent).toContain("15.09");
      await select("[data-anchor]", "2026-09-07");
      expect(saved.alternation).toEqual({ anchor_week: "2026-09-07" });
      expect(container.textContent).not.toContain("неактивных недель (1)");
      expect(container.textContent).toContain("22.09");
      expect(saved.edits).toEqual(original.edits);
      await act(async () =>
        root.render(
          createElement(Editor, {
            key: "reopen",
            initial: structuredClone(saved),
          }),
        ),
      );
      expect(
        container.querySelector<HTMLSelectElement>("[data-anchor]")?.value,
      ).toBe("2026-09-07");
      await select("select", "weekly");
      expect(saved.alternation).toBeNull();
      expect(saved.edits).toEqual(original.edits);
      expect(container.querySelector("[data-anchor]")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
