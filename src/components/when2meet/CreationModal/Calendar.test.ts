// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Calendar } from "./Calendar.tsx";

describe("Calendar touch interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse("2027-06-15T09:00:00Z") });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  function renderCalendar() {
    act(() => {
      root.render(
        createElement(Calendar, {
          onDatesChange: vi.fn(),
        }),
      );
    });

    const cells = container.querySelectorAll<HTMLElement>("[data-index]");
    const selectableCell = cells.item(cells.length - 1);

    expect(selectableCell).toBeDefined();
    return selectableCell;
  }

  function dispatchTouchPointer(
    target: EventTarget,
    type: string,
    clientX: number,
    clientY: number,
  ) {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: "touch" },
    });
    target.dispatchEvent(event);
  }

  it("selects a date after a touch tap", () => {
    const cell = renderCalendar();

    act(() => {
      dispatchTouchPointer(cell, "pointerdown", 20, 20);
      dispatchTouchPointer(window, "pointerup", 20, 20);
    });

    expect(cell.classList.contains("text-primary-content")).toBe(true);
  });

  it("does not select a date while vertically scrolling", () => {
    const cell = renderCalendar();

    act(() => {
      dispatchTouchPointer(cell, "pointerdown", 20, 20);
      dispatchTouchPointer(window, "pointermove", 20, 60);
      dispatchTouchPointer(window, "pointerup", 20, 60);
    });

    expect(cell.classList.contains("text-primary-content")).toBe(false);
  });

  it("selects a date range after a long press", () => {
    const firstCell = renderCalendar();
    const secondCell = firstCell.previousElementSibling as HTMLElement;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => secondCell,
    });

    act(() => {
      dispatchTouchPointer(firstCell, "pointerdown", 20, 20);
      vi.advanceTimersByTime(400);
      dispatchTouchPointer(window, "pointermove", 40, 20);
      dispatchTouchPointer(window, "pointerup", 40, 20);
    });

    expect(firstCell.classList.contains("text-primary-content")).toBe(true);
    expect(secondCell.classList.contains("text-primary-content")).toBe(true);
  });
});
