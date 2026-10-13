import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingRecommendation } from "./booking-recommendations.ts";
import { BookingsWidget } from "./BookingsWidget.tsx";

const state = vi.hoisted(() => ({
  nowMs: Date.parse("2026-06-15T09:00:00Z"),
  entries: [] as BookingRecommendation[],
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./useBookingRecommendations.ts", () => ({
  useBookingRecommendations: () => state,
}));
vi.mock("@/lib/utils/use-now.ts", () => ({ useNowMS: () => state.nowMs }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: { room: string };
    children: import("react").ReactNode;
  }) =>
    createElement(
      "a",
      { href: params ? to.replace("$room", params.room) : to, ...props },
      children,
    ),
}));
let root: Root;
let container: HTMLDivElement;
async function render() {
  await act(async () => root.render(createElement(BookingsWidget)));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.entries = [];
  state.isPending = false;
  state.isError = false;
  state.isFetching = false;
  state.refetch.mockClear();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

describe("BookingsWidget", () => {
  it("links each room and distinguishes owned, finite free and horizon-only availability", async () => {
    state.entries = [
      {
        kind: "booked",
        roomId: "101",
        roomTitle: "Room 101",
        booking: {
          id: "mine",
          room_id: "101",
          title: "Study session",
          start: new Date(state.nowMs - 60_000).toISOString(),
          end: new Date(state.nowMs + 60_000).toISOString(),
          attendees: null,
          outlook_booking_id: null,
          outlook_entry_id: null,
        },
      },
      {
        kind: "available",
        roomId: "102",
        roomTitle: "Room 102",
        availableUntilMs: state.nowMs + 86_400_000,
        nextBookingKnown: false,
      },
      {
        kind: "available",
        roomId: "103",
        roomTitle: "Room 103",
        availableUntilMs: state.nowMs + 2 * 3600_000,
        nextBookingKnown: true,
      },
      {
        kind: "available",
        roomId: "104",
        roomTitle: "Room 104",
        availableUntilMs: state.nowMs + 2 * 3600_000 + 23 * 60_000,
        nextBookingKnown: true,
      },
    ];
    await render();
    expect(container.querySelectorAll("li")).toHaveLength(4);
    expect(container.textContent).toContain("Today");
    expect(container.textContent).toContain("Available rooms");
    expect(container.textContent).not.toContain("Possible bookings");
    expect(container.textContent).toContain("Room 101");
    expect(container.textContent).toContain("Study session");
    expect(container.textContent).not.toContain("Booked by you");
    expect(container.textContent).toContain("Free for at least 1d");
    expect(container.textContent).toContain("Free for 2h");
    expect(container.textContent).toContain("Free for 2h 23min");
    expect(container.querySelector("li a")?.getAttribute("href")).toBe(
      "/room-booking/rooms/101",
    );
    expect(container.querySelector("section > a")?.getAttribute("href")).toBe(
      "/room-booking",
    );
    expect(container.querySelector("section > a")?.textContent).toBe(
      "Go to room booking",
    );
  });
  it("shows a skeleton while loading and no empty-state filler", async () => {
    state.isPending = true;
    await render();
    expect(container.querySelectorAll(".skeleton")).toHaveLength(6);
    state.isPending = false;
    await render();
    expect(container.querySelector("section")?.children).toHaveLength(2);
  });
  it("keeps error/retry visible rather than describing unavailable data as free rooms", async () => {
    state.isError = true;
    await render();
    expect(container.textContent).toContain("could not be verified");
    expect(container.textContent).not.toContain("Free for");
    await act(async () => container.querySelector("button")?.click());
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});
