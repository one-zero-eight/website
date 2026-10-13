import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dashboardCalendarQueryOptions,
  useDashboardCalendar,
} from "./useDashboardCalendar.ts";

const mocks = vi.hoisted(() => ({
  loadFeed: vi.fn(),
  refetchMetadata: vi.fn(),
  refetchMeetings: vi.fn(),
  metadataPending: false,
  metadataError: false,
  meetingsError: false,
}));
vi.mock("@/api/schedule", () => ({
  $schedule: {
    useQuery: (_method: string, path: string) => {
      const metadata: Record<string, unknown> = {
        "/users/me": {
          id: 123,
          favorite_event_groups: [],
          hidden_event_groups: [],
          music_room_hidden: false,
          sports_hidden: false,
          moodle_hidden: true,
          linked_calendars: {},
        },
        "/event-groups/": { event_groups: [] },
        "/users/me/predefined": { event_groups: [] },
      };
      const data = metadata[path];
      return {
        data: mocks.metadataPending || mocks.metadataError ? undefined : data,
        isPending: mocks.metadataPending,
        isError: mocks.metadataError,
        error: mocks.metadataError ? new Error("Selection failed") : null,
        refetch: mocks.refetchMetadata,
      };
    },
    queryOptions: (method: string, path: string, init: unknown) => ({
      queryKey: ["schedule", method, path, init],
      queryFn: () => mocks.loadFeed(path, init),
    }),
  },
}));
vi.mock("./useWhen2MeetCalendarEvents.ts", () => ({
  useWhen2MeetCalendarData: () => ({
    meetings: [],
    isPending: false,
    isError: mocks.meetingsError,
    errors: mocks.meetingsError
      ? [{ sourceId: "when2meet:owned", error: new Error("Meeting failed") }]
      : [],
    refetch: mocks.refetchMeetings,
  }),
}));

const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:day",
  "SUMMARY:Music room",
  "DTSTART:20260615T100000",
  "DTEND:20260615T110000",
  "RRULE:FREQ=DAILY;COUNT=2",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");
const emptyIcs = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
let result: ReturnType<typeof useDashboardCalendar>;
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let nowMs: number;
function Harness() {
  const calendar = useDashboardCalendar(nowMs);
  useEffect(() => {
    result = calendar;
  }, [calendar]);
  return null;
}
async function render() {
  await act(async () =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Harness)),
    ),
  );
}
async function settled() {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.isPending).toBe(false);
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.metadataPending = false;
  mocks.metadataError = false;
  mocks.meetingsError = false;
  mocks.loadFeed
    .mockReset()
    .mockImplementation((path: string) =>
      Promise.resolve(path.includes("music-room") ? ics : emptyIcs),
    );
  mocks.refetchMetadata.mockReset().mockResolvedValue(undefined);
  mocks.refetchMeetings.mockReset().mockResolvedValue(undefined);
  nowMs = new Date(2026, 5, 15, 12).getTime();
  container = document.createElement("div");
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});

describe("useDashboardCalendar", () => {
  it("builds typed group/import feed queries with user and alias parameters", () => {
    const group = dashboardCalendarQueryOptions({
      id: "group:1",
      kind: "group",
      userId: 123,
      excludeEnglish: false,
      group: {
        id: 1,
        alias: "group-one",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        virtual: false,
      },
    });
    expect(group.queryKey).toEqual([
      "schedule",
      "get",
      "/{event_group_alias}.ics",
      {
        params: {
          path: { event_group_alias: "group-one" },
          query: { user_id: 123, export_type: "web" },
        },
        parseAs: "text",
      },
    ]);
    const imported = dashboardCalendarQueryOptions({
      id: "imported:external",
      kind: "imported",
      userId: 123,
      calendar: {
        id: 9,
        user_id: 123,
        alias: "external",
        url: "https://example.com/calendar.ics",
        is_active: true,
      },
    });
    expect(imported.queryKey).toEqual([
      "schedule",
      "get",
      "/users/{user_id}/linked/{linked_alias}.ics",
      {
        params: { path: { user_id: 123, linked_alias: "external" } },
        parseAs: "text",
      },
    ]);
  });

  it("waits for selection before requesting typed text feeds, excluding sport, workshops and room bookings", async () => {
    mocks.metadataPending = true;
    await render();
    expect(result.isPending).toBe(true);
    expect(mocks.loadFeed).not.toHaveBeenCalled();
    mocks.metadataPending = false;
    await render();
    await settled();
    expect(result.activities).toHaveLength(1);
    expect(result.isError).toBe(false);
    expect(mocks.loadFeed).toHaveBeenCalledWith("/users/me/events.ics", {
      parseAs: "text",
    });
    expect(mocks.loadFeed).toHaveBeenCalledWith("/users/me/music-room.ics", {
      parseAs: "text",
    });
    expect(
      mocks.loadFeed.mock.calls.some(
        ([path]) =>
          String(path).includes("sport") ||
          String(path).includes("workshops") ||
          String(path).includes("room-bookings"),
      ),
    ).toBe(false);
  });

  it("merges the same UID and interval from different feeds before the UI limits results", async () => {
    mocks.loadFeed.mockResolvedValue(ics);
    await render();
    await settled();
    expect(mocks.loadFeed).toHaveBeenCalledTimes(2);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].uid).toBe("day");
  });

  it("reports selection errors instead of a successful empty calendar", async () => {
    mocks.metadataError = true;
    await render();
    expect(result.isError).toBe(true);
    expect(result.errors.map((error) => error.sourceId)).toContain(
      "selection:user",
    );
    expect(mocks.loadFeed).not.toHaveBeenCalled();
  });

  it("retains successful data alongside HTTP, parse and meeting failures", async () => {
    mocks.loadFeed.mockImplementation((path: string) =>
      path.includes("music-room")
        ? Promise.resolve(ics)
        : Promise.reject(new Error("HTTP failure")),
    );
    mocks.meetingsError = true;
    await render();
    await settled();
    expect(result.activities).toHaveLength(1);
    expect(result.isError).toBe(true);
    expect(result.errors.map((error) => error.sourceId)).toEqual([
      "events",
      "when2meet:owned",
    ]);
    mocks.loadFeed.mockResolvedValue("not an ICS document");
    await act(async () => {
      await result.refetch();
    });
    await settled();
    expect(result.errors.some((error) => error.sourceId === "music-room")).toBe(
      true,
    );
  });

  it("refetches metadata, feeds and meetings, and recovers from errors", async () => {
    mocks.loadFeed.mockRejectedValue(new Error("Offline"));
    await render();
    await settled();
    expect(result.isError).toBe(true);
    mocks.loadFeed.mockResolvedValue(emptyIcs);
    await act(async () => {
      await result.refetch();
    });
    await settled();
    expect(result.isError).toBe(false);
    expect(mocks.refetchMetadata).toHaveBeenCalledTimes(3);
    expect(mocks.refetchMeetings).toHaveBeenCalledOnce();
    expect(result.activities).toEqual([]);
  });

  it("reloads and re-expands for the new day when nowMs crosses local midnight", async () => {
    await render();
    await settled();
    expect(result.activities[0].start).toEqual(new Date(2026, 5, 15, 10));
    nowMs = new Date(2026, 5, 16).getTime();
    await render();
    await settled();
    expect(result.activities[0].start).toEqual(new Date(2026, 5, 16, 10));
    expect(mocks.loadFeed).toHaveBeenCalledTimes(4);
  });
});
