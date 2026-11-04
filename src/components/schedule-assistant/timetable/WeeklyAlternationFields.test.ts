import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaScheduleConfig,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import {
  WeeklyAlternationFields,
  type SessionWindowValue,
} from "./sessionSeriesRows.tsx";
import { activeForBlock } from "./sessionWindows.ts";

const i18n = setupI18n({ locale: "en", messages: {} });

vi.mock("@/components/schedule-assistant/DateInput.tsx", () => ({
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
    blocks: [
      {
        id: "first",
        name: "Блок 1",
        start_date: "2026-09-01",
        end_date: "2026-09-15",
      },
      {
        id: "second",
        name: "Блок 2",
        start_date: "2026-09-16",
        end_date: "2026-09-30",
      },
    ],
  },
  students_groups: [],
  courses: [],
} as unknown as SchemaScheduleConfig;

describe("weekly alternation editor", () => {
  it("shows window in the trigger and edits frequency plus block in the popup", async () => {
    const original: SchemaWeeklyPatternSlot = {
      weekday: Weekday.TUESDAY,
      start_time: "09:00:00",
      end_time: "10:30:00",
      edits: [{ select_week: "2026-09-07", cancel: true }],
    };
    let saved = original;
    let windowValue: SessionWindowValue = { active: null };
    function Editor({ initial }: { initial: SchemaWeeklyPatternSlot }) {
      const [slot, setSlot] = useState(initial);
      return createElement(WeeklyAlternationFields, {
        config,
        slot,
        audienceTokens: [],
        active: windowValue.active,
        onSessionWindowChange: (next) => {
          windowValue = next;
        },
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
    async function openPopup() {
      await act(async () => {
        container.querySelector("button")!.click();
      });
    }
    async function clickLabel(label: string) {
      await act(async () => {
        [...document.body.querySelectorAll("button")]
          .find((button) => button.textContent === label)!
          .click();
      });
    }
    try {
      await act(async () =>
        root.render(
          createElement(
            I18nProvider,
            { i18n },
            createElement(Editor, { initial: original }),
          ),
        ),
      );
      expect(container.textContent).toContain("Every week, whole semester");
      await openPopup();
      await clickLabel("Every other week");
      expect(saved.alternation).toEqual({ anchor_week: "2026-08-31" });
      expect(document.body.textContent).toContain(
        "not starting from this date",
      );
      expect(document.body.textContent).toContain("inactive weeks (1)");
      expect(document.body.textContent).toContain("01.09");
      expect(document.body.textContent).toContain("15.09");
      await act(async () => {
        const input =
          document.body.querySelector<HTMLSelectElement>("[data-anchor]")!;
        input.value = "2026-09-07";
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(saved.alternation).toEqual({ anchor_week: "2026-09-07" });
      expect(document.body.textContent).not.toContain("inactive weeks (1)");
      expect(document.body.textContent).toContain("22.09");
      expect(saved.edits).toEqual(original.edits);
      await clickLabel("Блок 1");
      expect(windowValue).toEqual({ active: activeForBlock("first") });
      await act(async () =>
        root.render(
          createElement(
            I18nProvider,
            { i18n },
            createElement(Editor, {
              key: "reopen",
              initial: structuredClone(saved),
            }),
          ),
        ),
      );
      expect(container.textContent).toContain("Every other week, Блок 1");
      await openPopup();
      await clickLabel("Every week");
      expect(saved.alternation).toBeNull();
      expect(saved.edits).toEqual(original.edits);
      expect(document.body.querySelector("[data-anchor]")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
