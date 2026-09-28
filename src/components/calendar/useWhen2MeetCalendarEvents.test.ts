import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useWhen2MeetCalendarData,
  useWhen2MeetCalendarEvents,
} from "./useWhen2MeetCalendarEvents.ts";
import { toCalendarLocalDate } from "./when2meet-events.ts";

const mocks = vi.hoisted(() => ({
  loadMeeting: vi.fn(),
  refetchList: vi.fn(),
  enabled: true,
  listError: false,
}));
vi.mock("@/api/accounts/user.ts", () => ({
  useMe: () => ({ me: mocks.enabled ? { id: "123" } : undefined }),
}));
vi.mock("@/api/when2meet", () => ({
  $when2meet: {
    useQuery: (_method: string, path: string) => ({
      data:
        path === "/meetings/"
          ? [{ slug: "shared" }]
          : [{ slug: "shared" }, { slug: "other" }],
      isPending: !mocks.enabled,
      isError: mocks.listError,
      error: mocks.listError ? new Error("List failed") : null,
      refetch: mocks.refetchList,
    }),
    queryOptions: (
      _method: string,
      _path: string,
      init: { params: { path: { meeting_ref: string } } },
    ) => ({
      queryKey: ["meeting", init.params.path.meeting_ref],
      queryFn: () => mocks.loadMeeting(init.params.path.meeting_ref),
    }),
  },
}));

let data: ReturnType<typeof useWhen2MeetCalendarData>;
let legacy: ReturnType<typeof useWhen2MeetCalendarEvents>;
let root: Root;
let client: QueryClient;
function Harness() {
  const queryData = useWhen2MeetCalendarData();
  const calendarEvents = useWhen2MeetCalendarEvents();
  useEffect(() => {
    data = queryData;
    legacy = calendarEvents;
  }, [queryData, calendarEvents]);
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
    expect(data.isPending).toBe(false);
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.enabled = true;
  mocks.listError = false;
  mocks.refetchList.mockReset().mockResolvedValue(undefined);
  mocks.loadMeeting.mockReset().mockImplementation((slug: string) =>
    Promise.resolve({
      slug,
      name: slug,
      selected_time:
        slug === "shared"
          ? { start: "2026-06-15T12:00:00Z", end: "2026-06-15T13:00:00Z" }
          : null,
    }),
  );
  root = createRoot(document.createElement("div"));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});

describe("When2Meet query-aware calendar wrapper", () => {
  it("deduplicates owned/participating meetings while preserving the legacy selected-event array", async () => {
    await render();
    await settled();
    expect(mocks.loadMeeting).toHaveBeenCalledTimes(2);
    expect(data.meetings).toHaveLength(2);
    expect(legacy).toHaveLength(1);
    expect(legacy[0]).toMatchObject({
      id: "when2meet-shared",
      title: "shared",
      start: toCalendarLocalDate("2026-06-15T12:00:00Z"),
    });
  });

  it("exposes partial detail failures with healthy meetings and retries lists/details", async () => {
    mocks.loadMeeting.mockImplementation((slug: string) =>
      slug === "other"
        ? Promise.reject(new Error("Failed"))
        : Promise.resolve({ slug, name: slug, selected_time: null }),
    );
    await render();
    await settled();
    expect(data.meetings).toHaveLength(1);
    expect(data.isError).toBe(true);
    expect(data.errors[0].sourceId).toBe("when2meet:other");
    await act(async () => {
      await data.refetch();
    });
    expect(mocks.refetchList).toHaveBeenCalledTimes(2);
    expect(mocks.loadMeeting).toHaveBeenCalledTimes(4);
  });

  it("exposes list errors and treats disabled queries as not pending", async () => {
    mocks.listError = true;
    await render();
    await settled();
    expect(data.errors.map((error) => error.sourceId)).toEqual([
      "when2meet:owned",
      "when2meet:participating",
    ]);
    mocks.enabled = false;
    mocks.listError = false;
    await render();
    expect(data.isPending).toBe(false);
  });
});
