import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { TimetableBlockNavigation } from "./TimetableBlockNavigation.tsx";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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

describe("TimetableBlockNavigation", () => {
  it("switches presets and weeks independently and marks block boundaries", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onBlockChange = vi.fn();
    const onWeekChange = vi.fn();
    try {
      await act(async () =>
        root.render(
          createElement(TimetableBlockNavigation, {
            blocks,
            selectedBlockId: "second",
            onBlockChange,
            weeks,
            weekIndex: 2,
            onWeekChange,
          }),
        ),
      );
      const buttons = [...container.querySelectorAll("button")];
      const selectedBlock = buttons.find(
        (button) => button.textContent === "Второй блок",
      )!;
      expect(selectedBlock.className).toContain("btn-primary");
      expect(selectedBlock.title).toContain("2026");
      await act(async () => selectedBlock.click());
      expect(onBlockChange).toHaveBeenLastCalledWith("second");
      expect(onWeekChange).not.toHaveBeenCalled();
      await act(async () => buttons[0].click());
      expect(onBlockChange).toHaveBeenLastCalledWith("all");

      const weekButtons = buttons.slice(3);
      expect(weekButtons[0].title).toContain("Первый блок");
      expect(weekButtons[1].title).not.toContain("Начало");
      expect(weekButtons[2].title).toContain("Второй блок");
      expect(weekButtons[2].className).toContain("bg-primary");
      await act(async () => weekButtons[1].click());
      expect(onWeekChange).toHaveBeenCalledWith(1);
      expect(onBlockChange).toHaveBeenCalledTimes(2);
      expect(buttons.every((button) => button.type === "button")).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
