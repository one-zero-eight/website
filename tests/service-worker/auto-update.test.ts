import {
  autoReloadTargetStorageKey,
  createAutoUpdateController,
  registerAutoUpdateBlocker,
  type AutoUpdateStatus,
} from "@/service-worker/page/auto-update.ts";
import { queryClient } from "@/app/query-client.ts";
import { checkManifest } from "@/service-worker/page/sw-client.ts";
import type { BuildInfo } from "@/service-worker/protocol.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/service-worker/page/sw-client.ts", () => ({
  checkManifest: vi.fn(),
}));
vi.mock("@/app/query-client.ts", () => ({
  queryClient: {
    isMutating: vi.fn(() => 0),
    getMutationCache: () => ({ subscribe: () => () => undefined }),
  },
}));

const current: BuildInfo = { version: "1.7.0", buildId: "build-a" };
const next: BuildInfo = { version: "1.7.0", buildId: "build-b" };

let controller: ReturnType<typeof createAutoUpdateController>;
let status: AutoUpdateStatus;
let navigationIdle: boolean;
const reload = vi.fn();
const removeBlockers: (() => void)[] = [];

function addBlocker() {
  const remove = registerAutoUpdateBlocker();
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
  vi.mocked(checkManifest).mockResolvedValue(next);
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

async function announce(buildInfo: BuildInfo) {
  controller.handleBuildReady({ type: "BUILD_READY", buildInfo });
  await vi.advanceTimersByTimeAsync(0);
}

function announceNextBuild() {
  return announce(next);
}

describe("automatic update controller", () => {
  it("confirms the build is ready on the server and records its target before reloading once", async () => {
    await announceNextBuild();
    expect(checkManifest).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(autoReloadTargetStorageKey)).toBe(
      next.buildId,
    );
    expect(reload).toHaveBeenCalledTimes(1);
    await announceNextBuild();
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
      await announceNextBuild();
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
    await announceNextBuild();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("waits while offline without contacting the worker", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await announceNextBuild();
    expect(status.blockedReason).toBe("offline");
    expect(checkManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it.each(["component-blocker", "mutation", "navigation"] as const)(
    "rechecks %s after asynchronous verification, preserving newly started work",
    async (reason) => {
      const pending = Promise.withResolvers<BuildInfo>();
      vi.mocked(checkManifest).mockReturnValue(pending.promise);
      await announceNextBuild();
      expect(status.blockedReason).toBe("verifying");
      if (reason === "component-blocker") addBlocker();
      else if (reason === "mutation")
        vi.mocked(queryClient.isMutating).mockReturnValue(1);
      else navigationIdle = false;
      pending.resolve(next);
      await vi.advanceTimersByTimeAsync(0);
      expect(status.blockedReason).toBe(reason);
      expect(reload).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(autoReloadTargetStorageKey)).toBeNull();
    },
  );

  it("applies the pending update on the same page when the last component blocker is removed", async () => {
    const removeFirst = addBlocker();
    const removeSecond = addBlocker();
    await announceNextBuild();
    expect(status.blockedReason).toBe("component-blocker");
    expect(checkManifest).not.toHaveBeenCalled();
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
    await announceNextBuild();
    expect(status.blockedReason).toBe("already-attempted");
    expect(checkManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not rely on a re-announced BUILD_READY when the server's build is not ready", async () => {
    vi.mocked(checkManifest).mockResolvedValue(null);
    await announceNextBuild();
    expect(status.blockedReason).toBe("not-ready");
    expect(reload).not.toHaveBeenCalled();
  });

  it("ignores an announcement of this page's own build", async () => {
    await announce(current);
    expect(checkManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("switches to the server's current build, not the announced one, so rollbacks apply too", async () => {
    const rolledBack: BuildInfo = { version: "1.6.0", buildId: "build-old" };
    vi.mocked(checkManifest).mockResolvedValue(rolledBack);
    await announceNextBuild();
    expect(sessionStorage.getItem(autoReloadTargetStorageKey)).toBe(
      rolledBack.buildId,
    );
    expect(status.pendingBuildId).toBe(rolledBack.buildId);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("drops a stale announcement when the server still serves this page's build", async () => {
    vi.mocked(checkManifest).mockResolvedValue(current);
    await announceNextBuild();
    expect(status).toMatchObject({ pendingBuildId: null, blockedReason: null });
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not resurrect an update after reset stops an in-flight verification", async () => {
    const pending = Promise.withResolvers<BuildInfo>();
    vi.mocked(checkManifest).mockReturnValue(pending.promise);
    await announceNextBuild();
    controller.stop();
    pending.resolve(next);
    await vi.advanceTimersByTimeAsync(0);
    expect(status.blockedReason).toBe("stopped");
    expect(reload).not.toHaveBeenCalled();
  });
});
