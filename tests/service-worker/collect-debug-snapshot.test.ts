import { getPageWorkerCommunication } from "@/service-worker/page/register-sw.ts";
import { requestWorker } from "@/service-worker/page/sw-client.ts";
import type {
  BuildInfo,
  WorkerDiagnosticsSnapshot,
} from "@/service-worker/protocol.ts";
import { emptyWorkerState } from "@/service-worker/storage.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectDebugSnapshot } from "@/components/debug/collect-debug-snapshot.ts";

vi.mock("@/service-worker/page/register-sw.ts", () => ({
  getPageWorkerCommunication: vi.fn(),
}));
vi.mock("@/service-worker/page/sw-client.ts", () => ({
  requestWorker: vi.fn(),
}));

const appBuildInfo: BuildInfo = {
  version: "1.7.0",
  buildId: "page-build",
};

function worker(state: ServiceWorkerState = "activated") {
  return { scriptURL: "https://example.com/sw.js", state } as ServiceWorker;
}

function workerReply(serviceWorkerHash: string): WorkerDiagnosticsSnapshot {
  return {
    worker: {
      buildInfo: { serviceWorkerHash },
      scriptURL: "https://example.com/sw.js",
      scope: "https://example.com/",
    },
    storage: emptyWorkerState(),
    runtimeClients: { requestingClientId: "current-page", windows: [] },
    cacheStorage: [],
  };
}

function browserWorkers({
  controller = null,
  active = null,
  waiting = null,
  installing = null,
}: {
  controller?: ServiceWorker | null;
  active?: ServiceWorker | null;
  waiting?: ServiceWorker | null;
  installing?: ServiceWorker | null;
} = {}) {
  const getRegistrations = vi.fn().mockResolvedValue([
    {
      scope: "https://example.com/",
      updateViaCache: "none",
      active,
      waiting,
      installing,
    },
  ]);
  vi.stubGlobal("navigator", {
    onLine: true,
    serviceWorker: { controller, getRegistrations },
  });
  return getRegistrations;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("BUILD_INFO", appBuildInfo);
  document.documentElement.dataset.buildId = appBuildInfo.buildId;
  vi.mocked(getPageWorkerCommunication).mockReturnValue({
    lastHello: null,
    lastNotification: null,
    autoUpdate: {
      pendingBuildId: null,
      blockedReason: null,
      lastReloadAttemptAt: null,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.buildId;
});

describe("diagnostic source boundaries", () => {
  it("queries one instance once even when it is both controlling and active", async () => {
    const active = worker();
    browserWorkers({ controller: active, active });
    vi.mocked(requestWorker).mockResolvedValue(workerReply("worker-code-hash"));

    const snapshot = await collectDebugSnapshot();

    expect(snapshot.app.buildInfo).toEqual(appBuildInfo);
    expect(snapshot.app.htmlBuildId).toBe("page-build");
    expect(snapshot.browser.controller).toBe("worker-1");
    expect(snapshot.browser.registrations[0].active).toBe("worker-1");
    expect(snapshot.workers).toHaveLength(1);
    expect(snapshot.workers[0].browser.roles).toEqual([
      "controlling",
      "active",
    ]);
    expect(snapshot.workers[0].reply?.worker.buildInfo).toEqual({
      serviceWorkerHash: "worker-code-hash",
    });
    expect(requestWorker).toHaveBeenCalledExactlyOnceWith(
      { type: "GET_DIAGNOSTICS" },
      active,
    );
  });

  it("does not merge different instances that share a script URL or substitute a failed reply", async () => {
    const controlling = worker();
    const active = worker();
    const waiting = worker("installed");
    browserWorkers({ controller: controlling, active, waiting });
    vi.mocked(requestWorker).mockImplementation(async (_command, target) => {
      if (target === waiting) throw new Error("Waiting worker timed out");
      return workerReply(target === controlling ? "old-code" : "new-code");
    });

    const snapshot = await collectDebugSnapshot();

    expect(snapshot.workers).toHaveLength(3);
    expect(snapshot.workers[0].browser.roles).toEqual(["controlling"]);
    expect(snapshot.workers[0].reply?.worker.buildInfo.serviceWorkerHash).toBe(
      "old-code",
    );
    expect(snapshot.workers[1].browser.roles).toEqual(["active"]);
    expect(snapshot.workers[1].reply?.worker.buildInfo.serviceWorkerHash).toBe(
      "new-code",
    );
    expect(snapshot.workers[2].reply).toBeNull();
    expect(snapshot.workers[2].error).toBe("Waiting worker timed out");
    expect(requestWorker).toHaveBeenCalledTimes(3);
  });

  it("retains App and controller observations if registrations cannot be read", async () => {
    const controlling = worker();
    const getRegistrations = browserWorkers({ controller: controlling });
    getRegistrations.mockRejectedValue(new Error("Registration access denied"));
    vi.mocked(requestWorker).mockResolvedValue(workerReply("worker-code"));

    const snapshot = await collectDebugSnapshot();

    expect(snapshot.app.buildInfo).toEqual(appBuildInfo);
    expect(snapshot.browser.error).toBe("Registration access denied");
    expect(snapshot.browser.registrations).toEqual([]);
    expect(snapshot.workers[0].reply?.worker.buildInfo.serviceWorkerHash).toBe(
      "worker-code",
    );
  });

  it("shows an unsupported browser without inventing a registration or worker", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const snapshot = await collectDebugSnapshot();

    expect(snapshot.app.buildInfo).toEqual(appBuildInfo);
    expect(snapshot.browser.supported).toBe(false);
    expect(snapshot.browser.online).toBe(false);
    expect(snapshot.browser.controller).toBeNull();
    expect(snapshot.browser.registrations).toEqual([]);
    expect(snapshot.workers).toEqual([]);
    expect(requestWorker).not.toHaveBeenCalled();
  });

  it("does not create workers when no registration or controller exists", async () => {
    browserWorkers().mockResolvedValue([]);

    const snapshot = await collectDebugSnapshot();

    expect(snapshot.browser.supported).toBe(true);
    expect(snapshot.browser.error).toBeNull();
    expect(snapshot.browser.registrations).toEqual([]);
    expect(snapshot.workers).toEqual([]);
    expect(requestWorker).not.toHaveBeenCalled();
  });
});
