import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AskCalendarEvents } from "./AskCalendarEvents";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/api/search", () => ({
  $search: { useMutation: () => ({ mutate, isPending: false }) },
}));
vi.mock("@/components/toast", () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({ Link: () => null }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubEnv("TZ", "UTC");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const offer = {
  id: "proposal-123",
  title: "Study",
  starts_at: "2026-11-08T23:30:00Z",
  ends_at: "2026-11-09T01:00:00Z",
  all_day: false,
  end_suggested: true,
} satisfies searchTypes.SchemaCalendarEventOffer;

function render(event: searchTypes.SchemaCalendarEventOffer = offer) {
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  act(() => {
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(AskCalendarEvents, { events: [event] }),
      ),
    );
  });
}

it("shows the full proposed cross-date interval and duration before posting only the proposal ID", () => {
  render();
  const text = container.textContent!;
  expect(text).toContain("Nov 8, 2026");
  expect(text).toContain("Nov 9, 2026");
  expect(text).toContain("11:30 PM");
  expect(text).toContain("01:00 AM");
  expect(text).toContain("Proposed duration: 90 minutes");
  expect(mutate).not.toHaveBeenCalled();
  act(() => container.querySelector("button")!.click());
  expect(mutate).toHaveBeenCalledExactlyOnceWith({
    params: { path: { proposal_id: "proposal-123" } },
  });
});

it("keeps known ends without claiming a suggested duration", () => {
  render({ ...offer, ends_at: "2026-11-09T02:15:00Z", end_suggested: false });
  expect(container.textContent).toContain("Nov 9, 2026");
  expect(container.textContent).toContain("02:15 AM");
  expect(container.textContent).not.toContain("90 minutes");
});

it("leaves old offers with no end or marker unknown, without displaying a fabricated end", () => {
  const { end_suggested: _marker, ...legacy } = offer;
  render({ ...legacy, ends_at: null } as searchTypes.SchemaCalendarEventOffer);
  expect(container.textContent).not.toContain("Nov 9");
  expect(container.textContent).not.toContain("90 minutes");
  expect(container.querySelector("button")!.disabled).toBe(false);
});

it("preserves the all-day date without clocks or a duration proposal", () => {
  render({
    ...offer,
    starts_at: "2026-11-08T00:00:00+03:00",
    all_day: true,
    ends_at: null,
    end_suggested: false,
  });
  expect(container.textContent).toContain("Nov 8, 2026");
  expect(container.textContent).not.toContain("PM");
  expect(container.textContent).not.toContain("AM");
  expect(container.textContent).not.toContain("90 minutes");
});

it.each(["bad", "", "2026-11-08T22:00:00Z"])(
  "does not post an invalid proposed end: %s",
  (ends_at) => {
    render({ ...offer, ends_at });
    const button = container.querySelector("button")!;
    expect(button.disabled).toBe(true);
    act(() => button.click());
    expect(mutate).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Invalid event interval");
  },
);
