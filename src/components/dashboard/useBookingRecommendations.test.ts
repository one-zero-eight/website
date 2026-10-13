import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBookingDashboardRange,
  useBookingRecommendations,
} from "./useBookingRecommendations.ts";

const state = vi.hoisted(() => ({
  nowMs: Date.parse("2026-06-15T12:00:00+03:00"),
  failed: "",
  pending: "",
  noRooms: false,
  stale: false,
  staleMetadata: "",
  calls: [] as { path: string; init: unknown; options: unknown }[],
  refetch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/api/accounts", () => ({
  $accounts: {
    useQuery: () => ({
      data: { innopolis_info: { is_student: true, is_staff: false } },
      isSuccess: true,
      isPending: false,
      isError: false,
      isFetching: false,
      dataUpdatedAt:
        state.nowMs - (state.staleMetadata === "/users/me" ? 7 * 60_000 : 0),
      refetch: state.refetch,
    }),
  },
}));
vi.mock("@/api/room-booking", () => ({
  $roomBooking: {
    useQuery: (
      _method: string,
      path: string,
      init?: unknown,
      options?: { enabled?: boolean },
    ) => {
      state.calls.push({ path, init, options });
      const booking = {
        id: "mine",
        room_id: "101",
        title: "Study",
        start: new Date(state.nowMs - 60_000).toISOString(),
        end: new Date(state.nowMs + 60_000).toISOString(),
        outlook_booking_id: null,
        outlook_entry_id: null,
        attendees: null,
      };
      const rooms = ["101", "102", "103"].map((id) => ({
        id,
        title: `Room ${id}`,
        short_name: id,
        access_level: "yellow",
        restrict_daytime: false,
      }));
      const data =
        path === "/rooms/"
          ? state.noRooms
            ? []
            : rooms
          : path === "/bookings/my"
            ? [booking]
            : path === "/bookings/"
              ? [booking]
              : [];
      const isError = state.failed === path;
      const isPending = state.pending === path || options?.enabled === false;
      return {
        data: isError || isPending ? undefined : data,
        isError,
        isPending,
        isSuccess: !isError && !isPending,
        isFetching: false,
        dataUpdatedAt:
          state.nowMs -
          (state.staleMetadata === path
            ? 7 * 60_000
            : state.stale
              ? 120_000
              : 0),
        refetch: state.refetch,
      };
    },
  },
}));
let root: Root;
let result: ReturnType<typeof useBookingRecommendations>;
function Harness() {
  const value = useBookingRecommendations(state.nowMs);
  useEffect(() => {
    result = value;
  }, [value]);
  return null;
}
async function render() {
  await act(async () => root.render(createElement(Harness)));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.failed = "";
  state.pending = "";
  state.noRooms = false;
  state.stale = false;
  state.staleMetadata = "";
  state.calls = [];
  state.refetch.mockClear();
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
});

describe("useBookingRecommendations", () => {
  it("combines current own bookings with free rooms from the bulk availability query", async () => {
    await render();
    expect(result.entries.map((entry) => entry.kind)).toEqual([
      "booked",
      "available",
      "available",
    ]);
    expect(result.isError).toBe(false);
    expect(
      state.calls.find((call) => call.path === "/bookings/")?.init,
    ).toEqual({
      params: {
        query: { ...getBookingDashboardRange(state.nowMs), include_red: true },
      },
    });
  });
  it.each(["/bookings/", "/rooms/my-access-list", "/rooms/"])(
    "does not invent free rooms if %s fails; retains own booking",
    async (path) => {
      state.failed = path;
      await render();
      expect(result.isError).toBe(true);
      expect(result.entries.map((entry) => entry.kind)).toEqual(["booked"]);
      await result.refetch();
      expect(state.refetch).toHaveBeenCalled();
    },
  );
  it("waits for personal bookings before filling slots with suggestions", async () => {
    state.pending = "/bookings/my";
    await render();
    expect(result.isPending).toBe(true);
    expect(result.entries).toEqual([]);
  });
  it("does not infer free rooms when personal bookings failed", async () => {
    state.failed = "/bookings/my";
    await render();
    expect(result.isError).toBe(true);
    expect(result.entries).toEqual([]);
  });
  it("suppresses expired availability snapshots but preserves personal bookings", async () => {
    state.stale = true;
    await render();
    expect(result.isError).toBe(true);
    expect(result.entries.map((entry) => entry.kind)).toEqual(["booked"]);
  });
  it.each(["/users/me", "/rooms/", "/rooms/my-access-list"])(
    "suppresses free suggestions when %s metadata expires even with fresh availability",
    async (path) => {
      state.staleMetadata = path;
      await render();
      expect(result.isError).toBe(true);
      expect(result.entries.map((entry) => entry.kind)).toEqual(["booked"]);
      state.staleMetadata = "";
      await render();
      expect(result.isError).toBe(false);
      expect(result.entries).toHaveLength(3);
    },
  );
  it("handles zero rooms without a disabled-query permanent loading state", async () => {
    state.noRooms = true;
    await render();
    expect(result.isPending).toBe(false);
    expect(result.entries[0]).toMatchObject({
      kind: "booked",
      roomTitle: "101",
    });
    expect(
      state.calls.find((call) => call.path === "/bookings/")?.options,
    ).toMatchObject({ enabled: false });
  });
  it("keeps query range stable during a day and advances at midnight", () => {
    const now = new Date(2026, 5, 15, 12).getTime();
    expect(getBookingDashboardRange(now)).toEqual(
      getBookingDashboardRange(now + 60_000),
    );
    expect(getBookingDashboardRange(now)).toEqual({
      start: new Date(2026, 5, 14).toISOString(),
      end: new Date(2026, 5, 29).toISOString(),
    });
    expect(
      getBookingDashboardRange(new Date(2026, 5, 16).getTime()),
    ).not.toEqual(getBookingDashboardRange(now));
  });
});
