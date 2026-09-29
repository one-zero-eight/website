// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";

describe("MeetingMobileBar", () => {
  let container: HTMLDivElement;
  let participantRowWidth: number;
  let participantTextWidth: number;
  let resizeObserverCallback: ResizeObserverCallback;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    participantRowWidth = 200;
    participantTextWidth = 300;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function () {
        return this.hasAttribute("data-slot-participants-row")
          ? participantRowWidth
          : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
      function () {
        return this.hasAttribute("data-slot-participants-measure")
          ? participantTextWidth
          : 0;
      },
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }

        observe() {
          resizeObserverCallback([], this as unknown as ResizeObserver);
        }

        disconnect() {}
      },
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders selected slot details with shortened participant names", () => {
    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          onToggleAvailability: vi.fn(),
          selectedSlotDetails: {
            label: "Sep 19, 17:30",
            participantNames: ["Timur Khasanov", "Anna Maria Belyakova"],
          },
        }),
      );
    });

    expect(document.body.textContent).toContain("Sep 19, 17:30");
    expect(document.body.textContent).toContain(
      "2 available: T. Khasanov, A. Belyakova",
    );
    expect(document.body.textContent).not.toContain("Timur Khasanov");

    const participantList = document.body.querySelector(
      "[data-slot-participants]",
    );
    const showAllButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "Show all");

    expect(participantList?.classList.contains("truncate")).toBe(true);
    expect(showAllButton).toBeDefined();

    act(() => showAllButton!.click());

    expect(participantList?.classList.contains("truncate")).toBe(false);
    expect(participantList?.classList.contains("overflow-y-auto")).toBe(true);
    expect(participantList?.classList.contains("max-h-[min(35vh,12rem)]")).toBe(
      true,
    );
    expect(document.body.textContent).toContain("Hide all");
  });

  it("keeps a details-only menu left-aligned without action spacing", () => {
    participantTextWidth = 100;

    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          selectedSlotDetails: {
            label: "Sep 19, 17:30",
            participantNames: ["Timur Khasanov"],
          },
        }),
      );
    });

    expect(document.body.querySelector("[data-mobile-bar-actions]")).toBeNull();
    expect(
      document.body
        .querySelector("[data-mobile-bar]")
        ?.classList.contains("py-3"),
    ).toBe(true);
    expect(
      document.body
        .querySelector("[data-selected-slot-details]")
        ?.classList.contains("text-left"),
    ).toBe(true);
    expect(document.body.textContent).not.toContain("Show all");
  });

  it("updates the show all button when the available width changes", () => {
    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          selectedSlotDetails: {
            label: "Sep 19, 17:30",
            participantNames: ["Timur Khasanov", "Anna Maria Belyakova"],
          },
        }),
      );
    });

    expect(document.body.textContent).toContain("Show all");

    participantRowWidth = 400;
    act(() => {
      resizeObserverCallback([], {} as ResizeObserver);
    });

    expect(document.body.textContent).not.toContain("Show all");
  });

  it("remeasures overflow when the selected slot changes", () => {
    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          selectedSlotDetails: {
            label: "Sep 19, 17:30",
            participantNames: ["Timur Khasanov", "Anna Maria Belyakova"],
          },
        }),
      );
    });

    expect(document.body.textContent).toContain("Show all");

    participantTextWidth = 100;
    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          selectedSlotDetails: {
            label: "Sep 19, 18:00",
            participantNames: ["Timur Khasanov"],
          },
        }),
      );
    });

    expect(document.body.textContent).not.toContain("Show all");
  });

  it("shows save beside cancel while editing availability", () => {
    act(() => {
      root.render(
        createElement(MeetingMobileBar, {
          onToggleAvailability: vi.fn(),
          onCancelAvailability: vi.fn(),
          isEditingAvailability: true,
        }),
      );
    });

    const buttonLabels = Array.from(
      document.body.querySelectorAll("button"),
    ).map((button) => button.textContent);

    expect(buttonLabels).toEqual(["Cancel", "Save timeslots"]);
    expect(document.body.textContent).not.toContain("Clear all");
  });
});
