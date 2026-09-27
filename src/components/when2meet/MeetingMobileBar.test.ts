// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";

describe("MeetingMobileBar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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

    expect(container.textContent).toContain("Sep 19, 17:30");
    expect(container.textContent).toContain(
      "2 available: T. Khasanov, A. Belyakova",
    );
    expect(container.textContent).not.toContain("Timur Khasanov");

    const participantList = container.querySelector("[data-slot-participants]");
    const showAllButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Show all",
    );

    expect(participantList?.classList.contains("truncate")).toBe(true);
    expect(showAllButton).toBeDefined();

    act(() => showAllButton!.click());

    expect(participantList?.classList.contains("truncate")).toBe(false);
    expect(participantList?.classList.contains("overflow-y-auto")).toBe(true);
    expect(participantList?.classList.contains("max-h-[min(35vh,12rem)]")).toBe(
      true,
    );
    expect(container.textContent).toContain("Hide all");
  });

  it("keeps a details-only menu left-aligned without action spacing", () => {
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

    expect(container.querySelector("[data-mobile-bar-actions]")).toBeNull();
    expect(
      container.querySelector("[data-mobile-bar]")?.classList.contains("py-3"),
    ).toBe(true);
    expect(
      container
        .querySelector("[data-selected-slot-details]")
        ?.classList.contains("text-left"),
    ).toBe(true);
  });
});
