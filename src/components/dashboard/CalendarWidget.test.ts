import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarWidget } from "./CalendarWidget.tsx";
import type { DashboardActivity } from "./activities.ts";

const state = vi.hoisted(() => ({
  now: new Date(2026, 0, 10, 12).getTime(),
  activities: [] as DashboardActivity[],
  isPending: false,
  isError: false,
  refetch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/components/calendar/useDashboardCalendar.ts", () => ({
  useDashboardCalendar: () => state,
}));
vi.mock("@/lib/utils/use-now.ts", () => ({ useNowMS: () => state.now }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: import("react").ReactNode;
  }) => createElement("a", { href: to, ...props }, children),
}));
let root: Root;
let container: HTMLDivElement;
async function render() {
  await act(async () => root.render(createElement(CalendarWidget)));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.isError = false;
  state.isPending = false;
  state.activities = [];
  state.refetch.mockClear();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

describe("CalendarWidget", () => {
  it("renders five remaining activities, live status and calendar link", async () => {
    state.activities = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      title: `Activity ${index}`,
      location: "Room 108",
      start: new Date(state.now + (index - 1) * 60_000),
      end: new Date(state.now + (index + 1) * 60_000),
    })).reverse();
    await render();
    expect(container.querySelectorAll("li")).toHaveLength(5);
    expect(container.querySelector("li")?.textContent).toContain("Activity 0");
    expect(container.textContent).toContain("In process");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/calendar",
    );
    expect(container.querySelector("a")?.textContent).toContain(
      "Go to calendar",
    );
  });
  it("shows loading and empty states separately", async () => {
    state.isPending = true;
    await render();
    expect(container.querySelector(".skeleton")).not.toBeNull();
    expect(container.textContent).not.toContain("No more activities");
    state.isPending = false;
    await render();
    expect(container.textContent).toContain("No more activities today");
  });
  it("shows failures with retry, not a misleading empty state", async () => {
    state.isError = true;
    await render();
    expect(container.textContent).toContain(
      "Some activities could not be loaded",
    );
    expect(container.textContent).not.toContain("No more activities today");
    await act(async () => container.querySelector("button")?.click());
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});
