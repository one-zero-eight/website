// @vitest-environment jsdom
import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { setupI18n, type I18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingMobileBar } from "./MeetingMobileBar.tsx";

describe("MeetingMobileBar", () => {
  let container: HTMLDivElement;
  let participantRowWidth: number;
  let participantTextWidth: number;
  let resizeObserverCallback: ResizeObserverCallback;
  let root: Root;
  let i18n: I18n;

  function renderWithI18n(children: ReactNode) {
    root.render(createElement(I18nProvider, { i18n }, children));
  }

  beforeEach(() => {
    i18n = setupI18n({
      locale: "en",
      messages: { en: enMessages, ru: ruMessages },
    });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    participantRowWidth = 200;
    participantTextWidth = 300;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-slot-participants-row")
          ? participantRowWidth
          : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
      function (this: HTMLElement) {
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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

  it("remeasures overflow and updates labels when the locale changes", () => {
    participantTextWidth = 100;

    act(() => {
      renderWithI18n(
        createElement(MeetingMobileBar, {
          onToggleAvailability: vi.fn(),
          selectedSlotDetails: {
            label: "Sep 19, 17:30",
            participantNames: ["Timur Khasanov", "Anna Maria Belyakova"],
          },
        }),
      );
    });

    expect(document.body.textContent).toContain(
      "2 available: T. Khasanov, A. Belyakova",
    );
    expect(document.body.textContent).toContain("Change my availability");
    expect(document.body.textContent).not.toContain("Show all");

    const measureWidth = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get");
    measureWidth.mockClear();
    participantTextWidth = 300;

    act(() => i18n.activate("ru"));

    expect(measureWidth).toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      "2 доступны: T. Khasanov, A. Belyakova",
    );
    expect(document.body.textContent).toContain("Изменить мои таймслоты");
    expect(document.body.textContent).not.toContain("Change my availability");

    const showAllButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "Показать всех");

    expect(showAllButton).toBeDefined();
    act(() => showAllButton!.click());
    expect(showAllButton?.textContent).toBe("Скрыть всех");

    measureWidth.mockClear();
    participantTextWidth = 100;

    act(() => i18n.activate("en"));

    expect(measureWidth).toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      "2 available: T. Khasanov, A. Belyakova",
    );
    expect(document.body.textContent).toContain("Change my availability");
    expect(document.body.textContent).not.toContain("Изменить мои таймслоты");
    expect(showAllButton?.textContent).toBe("Hide all");

    act(() => showAllButton!.click());
    expect(document.body.textContent).not.toContain("Show all");
    expect(document.body.textContent).not.toContain("Hide all");
  });

  it("shows save beside cancel while editing availability", () => {
    act(() => {
      renderWithI18n(
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
