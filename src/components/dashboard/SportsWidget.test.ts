import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SportsWidget } from "./SportsWidget.tsx";

const state = vi.hoisted(() => ({
  token: "test-token" as string | null,
  now: new Date(2026, 5, 15, 12).getTime(),
  pending: "",
  failed: "",
  refetch: vi.fn().mockResolvedValue(undefined),
  queryCalls: [] as { path: string; enabled?: boolean }[],
}));
vi.mock("@/api/helpers/sport-access-token.ts", () => ({
  useMySportAccessToken: () => [state.token],
}));
vi.mock("@/lib/utils/use-now.ts", () => ({ useNowMS: () => state.now }));
vi.mock("@/api/sport", () => ({
  $sport: {
    useQuery: (
      _method: string,
      path: string,
      _init: unknown,
      options: { enabled?: boolean; select?: (data: unknown) => unknown } = {},
    ) => {
      state.queryCalls.push({ path, enabled: options.enabled });
      let data: unknown;
      if (path === "/users/me") data = { user_id: 123 };
      else if (path === "/semesters/current") data = { end: "2026-08-31" };
      else if (path === "/students/{student_id}/hours-summary")
        data = {
          hours_from_groups: 10,
          self_sport_hours: 6,
          required_hours: 30,
          debt: 3,
        };
      else if (path === "/users/me/schedule")
        data = Array.from({ length: 5 }, (_, index) => ({
          training: {
            id: index,
            start: new Date(state.now + index * 60_000).toISOString(),
            end: new Date(state.now + (index + 30) * 60_000).toISOString(),
            is_all_day: false,
            training_location: { id: 1, name: "Sport hall" },
            display_name: `Training ${index}`,
            sport_name: null,
            group_name: null,
            training_custom_name: null,
            is_accredited: false,
            is_club: false,
            is_paid: false,
            sport_id: null,
            group_id: 1,
            checkins_count: 0,
            max_checkins: 10,
          },
          checked_in: index !== 0,
          can_check_in: true,
          can_grade: false,
          can_edit: false,
        }));
      const isPending = state.pending === path || options.enabled === false;
      const isError = state.failed === path;
      return {
        data:
          isPending || isError
            ? undefined
            : options.select
              ? options.select(data)
              : data,
        isPending,
        isError,
        isFetching: false,
        refetch: state.refetch,
      };
    },
  },
}));
let root: Root;
let container: HTMLDivElement;
async function render() {
  await act(async () => root.render(createElement(SportsWidget)));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.token = "test-token";
  state.pending = "";
  state.failed = "";
  state.queryCalls = [];
  state.refetch.mockClear();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

describe("SportsWidget", () => {
  it("renders only three checked-in sessions, status, hours/debt, deadline and navigation", async () => {
    await render();
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.textContent).not.toContain("Training 0");
    expect(container.textContent).toContain("Starts in 1 min");
    expect(container.textContent).toContain("16 / 30 +3 (debt)");
    expect(container.textContent).toContain("August 31, 2026");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://sport.innopolis.university/profile/",
    );
  });
  it("disables requests and hides the card without a sport token", async () => {
    state.token = null;
    await render();
    expect(container.textContent).toBe("");
    expect(state.queryCalls.every((query) => query.enabled === false)).toBe(
      true,
    );
  });
  it("waits for profile before requesting check-ins", async () => {
    state.pending = "/users/me";
    await render();
    expect(container.querySelector(".skeleton")).not.toBeNull();
    expect(
      state.queryCalls.find((query) => query.path === "/users/me/schedule")
        ?.enabled,
    ).toBe(false);
  });
  it("reports profile failure and allows retry instead of a permanent skeleton", async () => {
    state.failed = "/users/me";
    await render();
    expect(container.textContent).toContain(
      "Could not load your sport profile",
    );
    expect(container.querySelector(".skeleton")).toBeNull();
    await act(async () => container.querySelector("button")?.click());
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it("keeps check-ins visible if hours fail, and hours visible if check-ins fail", async () => {
    state.failed = "/students/{student_id}/hours-summary";
    await render();
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.textContent).toContain(
      "Sport hours or deadline could not be loaded",
    );
    state.failed = "/users/me/schedule";
    await render();
    expect(container.textContent).toContain(
      "Some activities could not be loaded",
    );
    expect(container.textContent).toContain("16 / 30");
  });
});
