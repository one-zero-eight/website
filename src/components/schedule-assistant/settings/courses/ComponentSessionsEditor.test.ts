import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  Weekday,
  type SchemaComponentSessionSeries,
  type SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { ComponentSessionsEditor } from "./ComponentSessionsEditor.tsx";

vi.mock(
  "@/components/schedule-assistant/timetable/SessionSeriesEditor.tsx",
  () => ({
    SessionSeriesEditor: ({
      placement,
      onPlacementChange,
    }: {
      placement: string;
      onPlacementChange: (value: string) => void;
    }) =>
      createElement(
        "div",
        { "data-placement": placement },
        createElement(
          "button",
          { type: "button", onClick: () => onPlacementChange("weekly") },
          "Еженедельно",
        ),
        createElement(
          "button",
          { type: "button", onClick: () => onPlacementChange("dates_pattern") },
          "Даты",
        ),
      ),
  }),
);
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
const weekly: SchemaComponentSessionSeries = {
  audience: [],
  weekly_pattern: [
    {
      weekday: Weekday.TUESDAY,
      start_time: "09:00:00",
      end_time: "10:30:00",
      alternation: { anchor_week: "2026-09-14" },
      edits: [{ select_week: "2026-09-07", cancel: true }],
    },
  ],
};

async function mount(initial: SchemaComponentSessionSeries) {
  let saved = [initial];
  function Editor() {
    const [sessions, setSessions] = useState(saved);
    return createElement(ComponentSessionsEditor, {
      config,
      courseIndex: null,
      componentIndex: null,
      sessions,
      onChange: (next) => {
        saved = next ?? [];
        setSessions(saved);
      },
    });
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => root.render(createElement(Editor)));
  return {
    saved: () => saved[0],
    placement: () =>
      container
        .querySelector("[data-placement]")
        ?.getAttribute("data-placement"),
    click: async (label: string) =>
      act(async () => {
        const button = [...container.querySelectorAll("button")].find(
          (button) => button.textContent === label,
        );
        button!.click();
      }),
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe("course settings schedule conversion", () => {
  it("materializes active dates and restores the unchanged alternating template without warning", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const editor = await mount(structuredClone(weekly));
    try {
      await editor.click("Даты");
      expect(editor.saved().dates_pattern?.map((item) => item.date)).toEqual([
        "2026-09-01",
        "2026-09-15",
        "2026-09-29",
      ]);
      await editor.click("Еженедельно");
      expect(editor.saved().weekly_pattern).toEqual(weekly.weekly_pattern);
      expect(confirm).not.toHaveBeenCalled();
      await editor.click("Еженедельно");
      expect(editor.saved().weekly_pattern).toEqual(weekly.weekly_pattern);
    } finally {
      await editor.cleanup();
      confirm.mockRestore();
    }
  });

  it("requires confirmation before adding previously absent weeks", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const initial: SchemaComponentSessionSeries = {
      audience: [],
      dates_pattern: [
        { date: "2026-09-15", start_time: "09:00:00", end_time: "10:30:00" },
      ],
      weekly_pattern: null,
    };
    const editor = await mount(initial);
    try {
      await editor.click("Еженедельно");
      expect(confirm).toHaveBeenCalledOnce();
      expect(editor.saved()).toEqual(initial);
      expect(editor.placement()).toBe("dates_pattern");
      confirm.mockReturnValue(true);
      await editor.click("Еженедельно");
      expect(editor.placement()).toBe("weekly");
      expect(editor.saved().dates_pattern).toBeNull();
    } finally {
      await editor.cleanup();
      confirm.mockRestore();
    }
  });

  it("keeps empty materialized dates empty instead of switching back to weekly implicitly", async () => {
    const cancelled = structuredClone(weekly);
    cancelled.weekly_pattern![0].edits = [
      "2026-08-31",
      "2026-09-14",
      "2026-09-28",
    ].map((select_week) => ({ select_week, cancel: true }));
    const editor = await mount(cancelled);
    try {
      await editor.click("Даты");
      expect(editor.saved().dates_pattern).toEqual([]);
      expect(editor.placement()).toBe("dates_pattern");
    } finally {
      await editor.cleanup();
    }
  });
});
