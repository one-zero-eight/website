import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type {
  SchemaComponentSessionSeries,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { SessionWindowFields } from "./SessionWindowFields.tsx";

type Active = SchemaComponentSessionSeries["active"];
const config = {
  term: {
    semester: { start_date: "2026-09-01", end_date: "2026-09-30" },
    blocks: [
      {
        id: "second",
        name: "Второй",
        start_date: "2026-09-16",
        end_date: "2026-09-30",
      },
      {
        id: "first",
        name: "Первый",
        start_date: "2026-09-01",
        end_date: "2026-09-15",
      },
    ],
    sections: [
      {
        code: "main",
        programs: [
          {
            code: "P",
            groups: ["G"],
            semester: { start_date: "2026-09-08", end_date: "2026-10-06" },
          },
        ],
      },
    ],
  },
  students_groups: [{ code: "G" }],
} as unknown as SchemaScheduleConfig;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function mount(active: Active = null) {
  const onChange = vi.fn();
  const onValidityChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(active);
    return createElement(SessionWindowFields, {
      config,
      audience: ["G"],
      active: value,
      onValidityChange,
      onChange: (next) => {
        onChange(next);
        setValue(next);
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
    select: async (value: string) =>
      act(async () => {
        const select = container.querySelector("select")!;
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    date: async (index: number, value: string) =>
      act(async () => {
        const input = container.querySelectorAll("input")[index];
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }),
    cleanup: async () => act(async () => root.unmount()),
  };
}

describe("SessionWindowFields", () => {
  it("distinguishes unlimited, full semester and chronological block presets and shows raw bounds", async () => {
    const editor = await mount();
    expect(editor.container.querySelector("select")!.value).toBe("audience");
    expect(editor.container.textContent).toContain("2026-09-08 — 2026-10-06");
    await editor.select("semester");
    expect(editor.onChange).toHaveBeenLastCalledWith(config.term.semester);
    expect(editor.container.textContent).toContain(
      "Выбранные границы: 2026-09-01 — 2026-09-30",
    );
    expect(editor.container.textContent).toContain(
      "Фактический период с учётом выбранных групп: 2026-09-08 — 2026-09-30",
    );
    await editor.select("block:0");
    expect(editor.onChange).toHaveBeenLastCalledWith({
      start_date: "2026-09-01",
      end_date: "2026-09-15",
    });
    expect(
      editor.container.querySelector("select")!.selectedOptions[0].text,
    ).toContain("Первый");
    await editor.select("audience");
    expect(editor.onChange).toHaveBeenLastCalledWith(null);
    await editor.cleanup();
  });

  it("keeps invalid custom drafts visible and reports invalidity instead of silently saving previous dates", async () => {
    const editor = await mount();
    await editor.select("custom");
    const previousCalls = editor.onChange.mock.calls.length;
    await editor.date(0, "");
    expect(editor.container.querySelector("input")!.value).toBe("");
    expect(editor.container.textContent).toContain("Укажите корректные даты");
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(false);
    expect(editor.onChange).toHaveBeenCalledTimes(previousCalls);
    await editor.date(0, "2026-10-07");
    expect(editor.container.textContent).toContain(
      "Начало периода должно быть не позже окончания",
    );
    expect(editor.onChange).toHaveBeenCalledTimes(previousCalls);
    await editor.date(0, "2026-09-10");
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(true);
    expect(editor.onChange).toHaveBeenLastCalledWith({
      start_date: "2026-09-10",
      end_date: "2026-10-06",
    });
    await editor.cleanup();
  });

  it("shows empty intersections and preserves the selected calendar dates", async () => {
    const editor = await mount({
      start_date: "2026-11-01",
      end_date: "2026-11-05",
    });
    expect(editor.container.textContent).toContain(
      "Выбранные границы: 2026-11-01 — 2026-11-05",
    );
    expect(editor.container.textContent).toContain("нет дат");
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(false);
    await editor.date(0, "2026-11-02");
    expect(editor.onChange).toHaveBeenLastCalledWith({
      start_date: "2026-11-02",
      end_date: "2026-11-05",
    });
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(false);
    await editor.select("audience");
    expect(editor.onValidityChange).toHaveBeenLastCalledWith(true);
    await editor.cleanup();
  });
});
