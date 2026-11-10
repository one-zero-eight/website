import {
  createAutoUpdateController,
  type AutoUpdateStatus,
} from "@/app/auto-update.ts";
import {
  autoReloadTargetStorageKey,
  registerAutoReloadBlocker,
} from "@/app/auto-update-safety.ts";
import { queryClient } from "@/app/query-client.ts";
import { requestWorker } from "@/app/sw-client.ts";
import type { BuildInfo, WorkerState } from "@/service-worker/protocol.ts";
import { emptyWorkerState } from "@/service-worker/storage.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/sw-client.ts", () => ({ requestWorker: vi.fn() }));
vi.mock("@/app/site-availability.ts", () => ({ setSiteUnavailable: vi.fn() }));
vi.mock("@/app/query-client.ts", () => ({
  queryClient: {
    isMutating: vi.fn(() => 0),
    getMutationCache: () => ({ subscribe: () => () => undefined }),
  },
}));

const current: BuildInfo = {
  version: "1.7.0",
  buildId: "build-a",
  resourcesBuildHash: "resources-a",
  commitHash: "commit-a",
  builtAt: "2026-11-10T10:00:00.000Z",
};
const next: BuildInfo = {
  ...current,
  buildId: "build-b",
  resourcesBuildHash: "resources-b",
  builtAt: "2026-11-10T10:01:00.000Z",
};
const readyState: WorkerState = {
  ...emptyWorkerState(),
  latestReadyBuildId: next.buildId,
  builds: [
    {
      state: "ready",
      completed: 1,
      error: null,
      cacheName: "build-b-cache",
      manifest: {
        schemaVersion: 1,
        buildInfo: next,
        entrypoint: "/index.html",
        resources: [{ url: "/index.html", size: 1, integrity: "sha384-test" }],
      },
    },
  ],
};

let controller: ReturnType<typeof createAutoUpdateController>;
let status: AutoUpdateStatus;
let navigationIdle: boolean;
const reload = vi.fn();
const removeBlockers: (() => void)[] = [];

function addBlocker() {
  const remove = registerAutoReloadBlocker();
  removeBlockers.push(remove);
  return remove;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("BUILD_INFO", current);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  window.history.replaceState(null, "", "/about");
  sessionStorage.clear();
  navigationIdle = true;
  vi.mocked(queryClient.isMutating).mockReturnValue(0);
  vi.mocked(requestWorker).mockImplementation(async (command) =>
    command.type === "CHECK_MANIFEST" ? next : readyState,
  );
  controller = createAutoUpdateController({
    isNavigationIdle: () => navigationIdle,
    reload,
    onStatusChange: (value) => {
      status = value;
    },
  });
});

afterEach(() => {
  controller.stop();
  for (const remove of removeBlockers.splice(0)) remove();
  document.body.replaceChildren();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function announceNextBuild() {
  controller.handleBuildReady({
    type: "BUILD_READY",
    buildInfo: next,
    generation: 0,
  });
}

describe("automatic update controller", () => {
  it("verifies a complete current build and records its target before reloading once", async () => {
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(requestWorker).toHaveBeenCalledWith({ type: "CHECK_MANIFEST" });
    expect(requestWorker).toHaveBeenCalledWith({ type: "GET_STATE" });
    expect(sessionStorage.getItem(autoReloadTargetStorageKey)).toBe(
      next.buildId,
    );
    expect(reload).toHaveBeenCalledTimes(1);
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it.each([
    "/forms",
    "/timer",
    "/debug",
    "/admin/users",
    "/new-unreviewed-route",
  ])(
    "auto-updates %s by default when no component has registered a blocker",
    async (pathname) => {
      window.history.replaceState(null, "", pathname);
      announceNextBuild();
      await vi.advanceTimersByTimeAsync(0);
      expect(reload).toHaveBeenCalledTimes(1);
    },
  );

  it("does not infer blockers from focus, typing, controls, dialogs or a hidden tab", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const input = document.createElement("input");
    const button = document.createElement("button");
    button.type = "button";
    const dialog = document.createElement("dialog");
    dialog.open = true;
    document.body.append(input, button, dialog);
    input.focus();
    input.value = "component-owned draft";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    button.click();
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it.each(["component-blocker", "mutation", "navigation"] as const)(
    "rechecks %s after asynchronous verification, preserving newly started work",
    async (reason) => {
      const pending = Promise.withResolvers<WorkerState>();
      vi.mocked(requestWorker).mockImplementation(async (command) =>
        command.type === "CHECK_MANIFEST" ? next : pending.promise,
      );
      announceNextBuild();
      await vi.advanceTimersByTimeAsync(0);
      expect(requestWorker).toHaveBeenCalledWith({ type: "GET_STATE" });
      if (reason === "component-blocker") {
        addBlocker();
      } else if (reason === "mutation") {
        vi.mocked(queryClient.isMutating).mockReturnValue(1);
      } else {
        navigationIdle = false;
      }
      pending.resolve(readyState);
      await vi.advanceTimersByTimeAsync(0);
      expect(status.blockedReason).toBe(reason);
      expect(reload).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(autoReloadTargetStorageKey)).toBeNull();
    },
  );

  it("applies the pending update on the same page when the last component blocker is removed", async () => {
    const removeFirst = addBlocker();
    const removeSecond = addBlocker();
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(status.blockedReason).toBe("component-blocker");
    expect(requestWorker).not.toHaveBeenCalled();
    removeFirst();
    await vi.advanceTimersByTimeAsync(0);
    expect(reload).not.toHaveBeenCalled();
    removeSecond();
    await vi.advanceTimersByTimeAsync(0);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe("/about");
  });

  it("does not loop if the previous document already tried this target build", async () => {
    sessionStorage.setItem(autoReloadTargetStorageKey, next.buildId);
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(status.blockedReason).toBe("already-attempted");
    expect(requestWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload an incomplete snapshot or rely on a cached BUILD_READY while disconnected", async () => {
    vi.mocked(requestWorker).mockResolvedValue(null);
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    expect(status.blockedReason).toBe("not-ready");
    expect(reload).not.toHaveBeenCalled();
    vi.mocked(requestWorker).mockImplementation(async (command) =>
      command.type === "CHECK_MANIFEST"
        ? next
        : {
            ...readyState,
            builds: [
              { ...readyState.builds[0], state: "downloading", completed: 0 },
            ],
          },
    );
    controller.recheck();
    await vi.advanceTimersByTimeAsync(0);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not resurrect an update after reset stops an in-flight verification", async () => {
    const pending = Promise.withResolvers<BuildInfo>();
    vi.mocked(requestWorker).mockReturnValue(pending.promise);
    announceNextBuild();
    await vi.advanceTimersByTimeAsync(0);
    controller.stop();
    pending.resolve(next);
    await vi.advanceTimersByTimeAsync(0);
    expect(status.blockedReason).toBe("stopped");
    expect(reload).not.toHaveBeenCalled();
  });
});
