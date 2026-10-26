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
      newOccurrenceDefaults,
      onOccurrencesChange,
    }: {
      newOccurrenceDefaults: { date: string };
      onOccurrencesChange: (occurrences: unknown[]) => void;
    }) =>
      createElement(
        "button",
        {
          type: "button",
          onClick: () =>
            onOccurrencesChange([
              {
                start_time: "09:00:00",
                end_time: "10:30:00",
                ...newOccurrenceDefaults,
              },
            ]),
        },
        "Add explicit date",
      ),
  }),
);
vi.mock(
  "@/components/schedule-assistant/timetable/meetingPickerIndex.ts",
  () => ({ buildMeetingPickerIndex: () => null }),
);
vi.mock(
  "@/components/schedule-assistant/timetable/timetableViewerModel.ts",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    buildMeetings: () => [],
  }),
);

const first = { start_date: "2026-09-01", end_date: "2026-09-15" };
const second = { start_date: "2026-09-16", end_date: "2026-09-30" };
const config = {
  term: {
    semester: { start_date: first.start_date, end_date: second.end_date },
    starting_day: Weekday.MONDAY,
    blocks: [
      { id: "first", name: "Первый", ...first },
      { id: "second", name: "Второй", ...second },
    ],
    sections: [],
    days: Object.values(Weekday),
    time_slots: [],
  },
  students_groups: [],
  courses: [],
} as unknown as SchemaScheduleConfig;
const weekly: SchemaComponentSessionSeries = {
  notes: "Keep notes",
  audience: ["G"],
  active: first,
  weekly_pattern: [
    {
      weekday: Weekday.TUESDAY,
      start_time: "09:00:00",
      end_time: "10:30:00",
      room: "108",
      instructor: "Teacher",
      edits: [
        { select_week: "2026-09-07", cancel: false, room: "old" },
        { select_week: "2026-09-21", cancel: false, room: "new" },
        {
          select_week: "2026-09-28",
          cancel: false,
          date: "2026-10-01",
          room: "outside",
        },
      ],
    },
  ],
  dates_pattern: null,
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function mount(series: SchemaComponentSessionSeries) {
  const onChange = vi.fn();
  const onValidityChange = vi.fn();
  function Harness() {
    const [sessions, setSessions] = useState([series]);
    return createElement(ComponentSessionsEditor, {
      config,
      courseIndex: null,
      componentIndex: null,
      sessions,
      onValidityChange,
      onChange: (next) => {
        onChange(next);
        setSessions(next ?? []);
      },
    });
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(createElement(Harness)));
  return {
    container,
    onChange,
    onValidityChange,
    duplicate: async () =>
      act(async () => {
        const select = [...container.querySelectorAll("select")].find(
          (select) =>
            select.closest("label")?.textContent?.includes("Дублировать"),
        )!;
        select.value = "1";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    cleanup: async () => act(async () => root.unmount()),
  };
}

describe("ComponentSessionsEditor block duplication", () => {
  it("copies notes, audience and weekly pattern without obsolete edits or source mutation", async () => {
    const editor = await mount(structuredClone(weekly));
    await editor.duplicate();
    const sessions = editor.onChange.mock
      .lastCall![0] as SchemaComponentSessionSeries[];
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toEqual(weekly);
    expect(sessions[1]).toMatchObject({
      notes: weekly.notes,
      audience: ["G"],
      active: second,
      dates_pattern: null,
    });
    expect(sessions[1].weekly_pattern![0]).toMatchObject({
      weekday: Weekday.TUESDAY,
      room: "108",
      instructor: "Teacher",
      edits: [{ select_week: "2026-09-21", cancel: false, room: "new" }],
    });
    expect(sessions[1].weekly_pattern).not.toBe(sessions[0].weekly_pattern);
    await editor.cleanup();
  });

  it("never invents or shifts calendar dates when duplicating explicit occurrences", async () => {
    const source = {
      ...weekly,
      weekly_pattern: null,
      dates_pattern: [
        {
          date: "2026-09-08",
          start_time: "09:00:00",
          end_time: "10:30:00",
          room: "108",
        },
      ],
    };
    const editor = await mount(source);
    await editor.duplicate();
    const duplicate = editor.onChange.mock.lastCall![0][1];
    expect(duplicate).toMatchObject({
      active: second,
      weekly_pattern: null,
      dates_pattern: [],
      audience: ["G"],
    });
    expect(editor.container.textContent).toContain("Добавьте даты вручную");
    await editor.cleanup();
  });

  it("leaves a newly added explicit date empty until the user chooses a calendar day", async () => {
    const editor = await mount({
      ...weekly,
      weekly_pattern: null,
      dates_pattern: [],
    });
    await act(async () => {
      [...editor.container.querySelectorAll("button")]
        .find((button) => button.textContent === "Add explicit date")!
        .click();
    });
    expect(editor.onChange.mock.lastCall![0][0].dates_pattern[0].date).toBe("");
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(false);
    await editor.cleanup();
  });

  it("blocks saving malformed or out-of-window explicit calendar dates", async () => {
    const editor = await mount({
      ...weekly,
      weekly_pattern: null,
      dates_pattern: [
        { date: "2026-09-31", start_time: "09:00:00", end_time: "10:30:00" },
      ],
    });
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(false);
    expect(editor.container.textContent).toContain("Даты вне периода серии");
    const duplicateSelect = [
      ...editor.container.querySelectorAll("select"),
    ].find((select) =>
      select.closest("label")?.textContent?.includes("Дублировать"),
    )!;
    expect(duplicateSelect.disabled).toBe(true);
    await editor.cleanup();
  });
});
