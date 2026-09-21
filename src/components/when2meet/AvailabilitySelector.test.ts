import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilitySelector } from "./AvailabilitySelector.tsx";

const now = Date.parse("2027-06-15T09:00:00Z");
const slot = (time: string) => `2027-06-15_${time}`;

describe("final meeting selection on the grid", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = vi.fn();
  const onEnd = vi.fn();
  const onApplySlots = vi.fn();
  const onPastMeetingTimeAttempt = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ now });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    onChange.mockClear();
    onEnd.mockClear();
    onApplySlots.mockClear();
    onPastMeetingTimeAttempt.mockClear();
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

  function renderGrid(isPhone = false, intervalSelectionMode = true) {
    act(() => {
      root.render(
        createElement(AvailabilitySelector, {
          dates: [{ id: "2027-06-15", monthDay: "Jun 15", weekDay: "Tue" }],
          timeSlots: ["11:30", "12:00", "12:30", "13:00"],
          users: [],
          viewedUserIds: new Set<string>(),
          editingUserId: intervalSelectionMode ? null : "user",
          draftSlots: new Set<string>(),
          onApplySlots,
          allowedSlots: new Set(["11:30", "12:00", "12:30", "13:00"].map(slot)),
          intervalSelectionMode,
          intervalSelectionSlots: new Set<string>(),
          onIntervalSelectionSlotsChange: onChange,
          onIntervalSelectionEnd: onEnd,
          onPastMeetingTimeAttempt,
          isPhone,
        }),
      );
    });
  }

  function cell(time: string) {
    const element = container.querySelector(`[data-slot-key="${slot(time)}"]`);
    expect(element).not.toBeNull();
    return element!;
  }

  function dispatchPointer(
    target: EventTarget,
    type: string,
    pointerType = "mouse",
    clientX = 0,
    pointerId = 1,
  ) {
    if (pointerType === "touch") {
      const event = new Event(
        type
          .replace("pointer", "touch")
          .replace("down", "start")
          .replace("up", "end"),
        {
          bubbles: true,
          cancelable: true,
        },
      );
      const touch = { identifier: pointerId, clientX, clientY: 0 };
      Object.defineProperties(event, {
        touches: {
          value:
            type === "pointerup" || type === "pointercancel" ? [] : [touch],
        },
        changedTouches: { value: [touch] },
      });
      (target === window ? cell("12:30") : target).dispatchEvent(event);
      return event;
    }
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
    });
    Object.defineProperties(event, {
      pointerId: { value: pointerId },
      pointerType: { value: pointerType },
    });
    target.dispatchEvent(event);
  }

  it.each([false, true])(
    "rejects past and current starts (phone=%s)",
    (isPhone) => {
      renderGrid(isPhone);
      act(() => {
        dispatchPointer(
          cell("11:30"),
          "pointerdown",
          isPhone ? "touch" : "mouse",
        );
        dispatchPointer(window, "pointerup", isPhone ? "touch" : "mouse");
        dispatchPointer(
          cell("12:00"),
          "pointerdown",
          isPhone ? "touch" : "mouse",
        );
        vi.advanceTimersByTime(300);
        dispatchPointer(window, "pointerup", isPhone ? "touch" : "mouse");
      });
      expect(onChange).not.toHaveBeenCalled();
      expect(onEnd).not.toHaveBeenCalled();
      expect(onPastMeetingTimeAttempt).toHaveBeenCalledTimes(2);
    },
  );

  it.each([false, true])(
    "clips a drag towards past slots (phone=%s)",
    (isPhone) => {
      renderGrid(isPhone);
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: () => cell("11:30"),
      });
      act(() => {
        dispatchPointer(
          cell("13:00"),
          "pointerdown",
          isPhone ? "touch" : "mouse",
        );
        if (isPhone) {
          vi.advanceTimersByTime(300);
        }
        dispatchPointer(window, "pointermove", isPhone ? "touch" : "mouse");
        dispatchPointer(window, "pointermove", isPhone ? "touch" : "mouse");
        dispatchPointer(window, "pointerup", isPhone ? "touch" : "mouse");
      });
      expect(onChange).toHaveBeenLastCalledWith([slot("13:00"), slot("12:30")]);
      expect(onEnd).toHaveBeenCalledWith([slot("13:00"), slot("12:30")]);
      expect(onPastMeetingTimeAttempt).toHaveBeenCalledTimes(1);
    },
  );

  it("selects availability on a short touch without waiting", () => {
    renderGrid(true, false);
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      dispatchPointer(window, "pointerup", "touch");
    });
    expect(onApplySlots).toHaveBeenCalledExactlyOnceWith(
      [slot("12:30")],
      "add",
    );
  });

  it("selects a meeting interval on a short tap", () => {
    renderGrid(true);
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      dispatchPointer(window, "pointerup", "touch");
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith([slot("12:30")]);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith([slot("12:30")]);
  });

  it("cancels an interval without confirming it and allows another gesture", () => {
    renderGrid(true);
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      vi.advanceTimersByTime(300);
      dispatchPointer(window, "pointercancel", "touch");
    });
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(onEnd).not.toHaveBeenCalled();

    act(() => {
      dispatchPointer(cell("13:00"), "pointerdown", "touch");
      dispatchPointer(window, "pointerup", "touch");
    });
    expect(onEnd).toHaveBeenCalledExactlyOnceWith([slot("13:00")]);
  });

  it("lets a swipe scroll without changing slots, even after waiting", () => {
    renderGrid(true, false);
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      const move = dispatchPointer(window, "pointermove", "touch", 20);
      expect(move?.defaultPrevented).toBe(false);
      vi.advanceTimersByTime(500);
      dispatchPointer(window, "pointerup", "touch", 20);
    });
    expect(onApplySlots).not.toHaveBeenCalled();
  });

  it("keeps selecting after pointercancel and blocks scrolling only after holding", () => {
    renderGrid(true);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => cell("13:00"),
    });
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      vi.advanceTimersByTime(300);
      const cancel = new Event("pointercancel", { bubbles: true });
      Object.defineProperties(cancel, {
        pointerType: { value: "touch" },
        pointerId: { value: 1 },
      });
      window.dispatchEvent(cancel);
      const move = dispatchPointer(window, "pointermove", "touch", 20);
      expect(move?.defaultPrevented).toBe(true);
      dispatchPointer(window, "pointerup", "touch", 20);
    });
    expect(onEnd).toHaveBeenCalledExactlyOnceWith([
      slot("12:30"),
      slot("13:00"),
    ]);
  });

  it("clears a pending hold on unmount", () => {
    renderGrid(true, false);
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown", "touch");
      root.render(null);
    });
    act(() => vi.advanceTimersByTime(500));
    expect(onApplySlots).not.toHaveBeenCalled();
  });

  it("does not warn for a future meeting time", () => {
    renderGrid();
    act(() => {
      dispatchPointer(cell("12:30"), "pointerdown");
      dispatchPointer(window, "pointerup");
    });
    expect(onEnd).toHaveBeenCalledWith([slot("12:30")]);
    expect(onPastMeetingTimeAttempt).not.toHaveBeenCalled();
  });

  it("still allows historical participant availability", () => {
    renderGrid(false, false);
    act(() => {
      dispatchPointer(cell("11:30"), "pointerdown");
      dispatchPointer(window, "pointerup");
    });
    expect(onApplySlots).toHaveBeenCalledWith([slot("11:30")], "add");
    expect(onPastMeetingTimeAttempt).not.toHaveBeenCalled();
  });
});
