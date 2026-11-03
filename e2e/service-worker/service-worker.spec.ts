import { createHash } from "node:crypto";
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import type {
  BuildInfo,
  BuildManifest,
  WorkerBuildInfo,
  WorkerCommand,
  WorkerState,
  WorkerStatus,
} from "../../src/service-worker/protocol";

type Version = "a" | "b" | "c";
type TestBuild = { manifest: BuildManifest; lazyResource: string };
type TestBuilds = Record<Version, TestBuild>;
type ServerState = {
  version: Version;
  connectionError?: boolean;
  httpStatus?: number;
  delayResource?: boolean;
  resourceStatus?: number;
  corruptResource?: boolean;
  clearRequests?: boolean;
};
type ServerSnapshot = ServerState & {
  delayedResources: number;
};
const normalInterval = 30 * 60_000;
const tvInterval = 60_000;

async function setServerState(request: APIRequestContext, state: ServerState) {
  const response = await request.post("/__test/state", { data: state });
  expect(response.status()).toBe(204);
}

async function serverSnapshot(
  request: APIRequestContext,
): Promise<ServerSnapshot> {
  const response = await request.get("/__test/state");
  expect(response.ok()).toBe(true);
  return response.json();
}

async function getBuilds(request: APIRequestContext): Promise<TestBuilds> {
  const response = await request.get("/__test/builds");
  expect(response.ok()).toBe(true);
  return response.json();
}

async function rpc<T>(page: Page, command: WorkerCommand): Promise<T> {
  return page.evaluate(async (message) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) throw new Error("No controlling service worker");
    return new Promise<T>((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        reject(new Error(`Service worker RPC timed out: ${message.type}`));
      }, 120_000);
      channel.port1.onmessage = (
        event: MessageEvent<{ ok: boolean; result: T; error?: string }>,
      ) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        if (!event.data.ok) {
          reject(new Error(event.data.error ?? "Service worker RPC failed"));
          return;
        }
        resolve(event.data.result);
      };
      controller.postMessage(message, [channel.port2]);
    });
  }, command);
}

function status(page: Page) {
  return rpc<WorkerStatus>(page, { type: "GET_STATUS" });
}

function workerState(page: Page) {
  return rpc<WorkerState>(page, { type: "GET_STATE" });
}

async function expectVersion(page: Page, version: Version) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-sw-test-version",
    version,
  );
  // HTML alone is insufficient: this marker executes in the actual app entry chunk.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as typeof globalThis & { __SW_TEST_VERSION__?: string })
            .__SW_TEST_VERSION__,
      ),
    )
    .toBe(version);
}

async function loadCount(page: Page) {
  return page.evaluate(() => Number(sessionStorage.getItem("sw-test-loads")));
}

async function expectReady(page: Page, info: BuildInfo) {
  await expect
    .poll(
      async () => {
        const current = await workerState(page);
        const build = current.builds.find(
          (item) => item.manifest.buildInfo.buildId === info.buildId,
        );
        return {
          latest: current.latestReadyBuildId,
          state: build?.state,
          complete: build?.completed === build?.manifest.resources.length,
        };
      },
      { timeout: 30_000 },
    )
    .toEqual({ latest: info.buildId, state: "ready", complete: true });
}

async function openControlledPage(
  context: BrowserContext,
  request: APIRequestContext,
  options: { tv?: boolean; clock?: boolean } = {},
) {
  const page = await context.newPage();
  if (options.clock) await page.clock.install();
  await page.addInitScript(({ tv }) => {
    const count = Number(sessionStorage.getItem("sw-test-loads") ?? 0);
    sessionStorage.setItem("sw-test-loads", String(count + 1));
    // Observe this document's scheduler rather than another tab's durable pin.
    const postMessage = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function (
      message: unknown,
      transferOptions?: Transferable[] | StructuredSerializeOptions,
    ) {
      const command = message as WorkerCommand;
      if (command?.type === "CLIENT_HELLO") {
        (
          globalThis as typeof globalThis & {
            __SW_TEST_LAST_HELLO__?: WorkerCommand;
          }
        ).__SW_TEST_LAST_HELLO__ = { ...command };
      }
      return Reflect.apply(postMessage, this, [message, transferOptions]);
    };
    if (tv) {
      localStorage.setItem("roomTvAccessToken", JSON.stringify("sw-tv-token"));
      localStorage.setItem("roomTvId", JSON.stringify("sw-room"));
    }
  }, options);
  await page.goto(options.tv ? "/tv" : "/debug");
  await expectVersion(page, "a");
  if (options.tv)
    await expect(
      page.getByRole("heading", { name: "sw-room", exact: true }),
    ).toBeVisible();
  else
    await expect(
      page.getByRole("heading", { name: "App and offline diagnostics" }),
    ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const builds = await getBuilds(request);
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.a.manifest.buildInfo);
  // A published ready snapshot can coexist with a second startup check. Wait
  // until this page advertises its next timer before changing the deployment.
  await scheduledCheck(page);
  await expect
    .poll(
      async () => (await workerState(page)).manifestCheck?.completedAt != null,
    )
    .toBe(true);
  // No setup reload: the first app load must be controlled and warmed in place.
  expect(await loadCount(page)).toBe(1);
  return page;
}

async function scheduledCheck(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const command = (
          globalThis as typeof globalThis & {
            __SW_TEST_LAST_HELLO__?: WorkerCommand;
          }
        ).__SW_TEST_LAST_HELLO__;
        return command?.type === "CLIENT_HELLO" && command.nextCheckAt !== null;
      }),
    )
    .toBe(true);
  return page.evaluate(() => {
    const command = (
      globalThis as typeof globalThis & {
        __SW_TEST_LAST_HELLO__?: WorkerCommand;
      }
    ).__SW_TEST_LAST_HELLO__;
    if (command?.type !== "CLIENT_HELLO" || !command.nextCheckAt)
      throw new Error("No scheduled page check");
    return {
      interval: command.interval,
      nextCheckAt: command.nextCheckAt,
      now: Date.now(),
    };
  });
}

async function advanceToPoll(page: Page, interval: number) {
  const scheduled = await scheduledCheck(page);
  expect(scheduled.interval).toBe(interval);
  // Replaying 30 minutes also replays hundreds of debug-page RPC intervals,
  // overwhelming a worker whose async operations still run in real time.
  // Skip only the idle period: stop before the manifest timer, then execute
  // that actual deadline without shifting its newly created RPC watchdogs.
  await page.clock.pauseAt(new Date(Date.parse(scheduled.nextCheckAt) - 1_000));
  await page.clock.runFor(1_001);
  await page.clock.resume();
}

test.beforeEach(async ({ request }) => {
  await setServerState(request, { version: "a", clearRequests: true });
});

test("build metadata describes real, distinct production bundles with verified integrity", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  const appInfo = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { BUILD_INFO: BuildInfo }).BUILD_INFO,
  );
  expect(appInfo).toEqual(builds.a.manifest.buildInfo);
  const workerInfo = await rpc<WorkerBuildInfo>(page, {
    type: "GET_BUILD_INFO",
  });
  expect(workerInfo.buildHash).toMatch(/^[\da-f]{64}$/);
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.status()).toBe(200);
  const workerSource = await workerResponse.text();
  // The bootstrap identity is excluded from the worker's own standalone-code hash.
  const workerCode = workerSource.slice(workerSource.indexOf("\n") + 1);
  expect(createHash("sha256").update(workerCode).digest("hex")).toBe(
    workerInfo.buildHash,
  );
  expect(workerInfo).toEqual({ buildHash: workerInfo.buildHash });
  expect(appInfo.commitHash).toMatch(/^[\da-f]{40}$/);
  expect(Number.isNaN(Date.parse(appInfo.builtAt))).toBe(false);

  expect(
    new Set(
      Object.values(builds).map((item) => item.manifest.buildInfo.buildId),
    ).size,
  ).toBe(3);
  expect(
    new Set(
      Object.values(builds).map((item) => item.manifest.buildInfo.buildHash),
    ).size,
  ).toBe(3);
  for (const version of ["a", "b", "c"] as const) {
    await setServerState(request, { version });
    const manifest = builds[version].manifest;
    expect(manifest.schemaVersion).toBe(1);
    expect(
      manifest.resources.some((item) => item.url === manifest.entrypoint),
    ).toBe(true);
    const hashResources = manifest.resources.filter(
      (item) => item.url !== "/build-info.js",
    );
    expect(
      createHash("sha256").update(JSON.stringify(hashResources)).digest("hex"),
    ).toBe(manifest.buildInfo.buildHash);
    expect(
      manifest.resources.some(
        (item) => item.url === "/sw.js" || item.url === "/build-manifest.json",
      ),
    ).toBe(false);
    let index = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (index < manifest.resources.length) {
          const resource = manifest.resources[index++];
          const response = await request.get(resource.url);
          expect(response.status(), resource.url).toBe(200);
          const bytes = await response.body();
          expect(bytes.byteLength, resource.url).toBe(resource.size);
          expect(
            `sha384-${createHash("sha384").update(bytes).digest("base64")}`,
            resource.url,
          ).toBe(resource.integrity);
        }
      }),
    );
  }
  const oldLazy = await request.get(builds.a.lazyResource);
  expect(oldLazy.status()).toBe(404);
});

test("app deployments keep identical sw.js and the same active worker", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  const initialSource = await (await request.get("/sw.js")).text();
  const workerEvents = { updateFound: 0, controllerChanged: 0 };
  await page.exposeFunction(
    "recordWorkerUpdate",
    (type: "updateFound" | "controllerChanged") => {
      workerEvents[type]++;
    },
  );
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) throw new Error("No active worker");
    const record = (
      globalThis as typeof globalThis & {
        recordWorkerUpdate: (type: string) => Promise<void>;
      }
    ).recordWorkerUpdate;
    registration.addEventListener(
      "updatefound",
      () => void record("updateFound"),
    );
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => void record("controllerChanged"),
    );
  });

  for (const version of ["b", "c"] as const) {
    await setServerState(request, { version });
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(initialSource);
    const unchanged = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error("No active worker");
      const active = registration.active;
      const controller = navigator.serviceWorker.controller;
      await registration.update();
      return (
        registration.active === active &&
        navigator.serviceWorker.controller === controller &&
        registration.installing === null &&
        registration.waiting === null
      );
    });
    expect(unchanged).toBe(true);
  }
  expect(workerEvents).toEqual({ updateFound: 0, controllerChanged: 0 });
});

test("first manual reload renders B immediately while nonessential resources download, without another reload", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await setServerState(request, { version: "b", delayResource: true });
  const before = await loadCount(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectVersion(page, "b");
  await expect(
    page.getByRole("heading", { name: "App and offline diagnostics" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await serverSnapshot(request)).delayedResources)
    .toBeGreaterThan(0);
  const downloading = await status(page);
  expect(downloading.latestReadyBuildId).toBe(
    builds.a.manifest.buildInfo.buildId,
  );
  expect(
    downloading.builds.find(
      (item) =>
        item.manifest.buildInfo.buildId === builds.b.manifest.buildInfo.buildId,
    )?.state,
  ).toBe("downloading");
  expect(await loadCount(page)).toBe(before + 1);
  await setServerState(request, { version: "b" });
  await expectReady(page, builds.b.manifest.buildInfo);
  await page.waitForTimeout(5_000);
  expect(await loadCount(page)).toBe(before + 1);
});

for (const failure of ["offline", "connection", "http500"] as const) {
  test(`${failure} navigation uses the latest COMPLETE cached build`, async ({
    context,
    request,
  }) => {
    const builds = await getBuilds(request);
    const page = await openControlledPage(context, request);
    await setServerState(request, { version: "b" });
    await rpc(page, { type: "CHECK_MANIFEST" });
    await expectReady(page, builds.b.manifest.buildInfo);
    await expectVersion(page, "a");
    await setServerState(request, {
      version: "c",
      connectionError: failure === "connection",
      httpStatus: failure === "http500" ? 500 : 200,
    });
    if (failure === "offline") await context.setOffline(true);
    await page.reload();
    await expectVersion(page, "b");
    await expectReady(page, builds.b.manifest.buildInfo);
    if (failure === "offline") await context.setOffline(false);
  });
}

test("normal 30-minute polling warms B but leaves idle A unchanged; manual and new tabs receive B", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  // Playwright's clock is context-wide. Install it before either app creates
  // timers; installing after the first tab has loaded mixes native/fake timers.
  const first = await openControlledPage(context, request, { clock: true });
  const idle = await openControlledPage(context, request);
  await setServerState(request, { version: "b" });
  await advanceToPoll(idle, normalInterval);
  await expectReady(idle, builds.b.manifest.buildInfo);
  await expectVersion(first, "a");
  await expectVersion(idle, "a");
  expect(await loadCount(first)).toBe(1);
  expect(await loadCount(idle)).toBe(1);
  // Subsequent document navigations must use the naturally ticking clock, not
  // depend on another explicit tick to complete async startup work.
  await first.clock.resume();
  await first.reload({ waitUntil: "domcontentloaded" });
  await expectVersion(first, "b");
  const fresh = await context.newPage();
  await fresh.goto("/debug", { waitUntil: "domcontentloaded" });
  await expectVersion(fresh, "b");
  await expectVersion(idle, "a");
  expect(await loadCount(idle)).toBe(1);
});

test("TV polls after one minute and reloads once, only after every resource is ready", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request, {
    tv: true,
    clock: true,
  });
  await setServerState(request, { version: "b", delayResource: true });
  await advanceToPoll(page, tvInterval);
  await expect
    .poll(async () => (await serverSnapshot(request)).delayedResources)
    .toBeGreaterThan(0);
  await expectVersion(page, "a");
  expect(await loadCount(page)).toBe(1);
  expect((await status(page)).latestReadyBuildId).toBe(
    builds.a.manifest.buildInfo.buildId,
  );
  await setServerState(request, { version: "b" });
  await expectVersion(page, "b");
  await expectReady(page, builds.b.manifest.buildInfo);
  expect(await loadCount(page)).toBe(2);
  await rpc(page, { type: "CHECK_MANIFEST" });
  await page.clock.fastForward(5_000);
  expect(await loadCount(page)).toBe(2);
});

test("a blocked TV reload preserves drafts and exposes a working Reload button", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request, {
    tv: true,
    clock: true,
  });
  // Chromium only honors beforeunload after a real user gesture.
  await page.getByRole("heading", { name: "sw-room", exact: true }).click();
  await page.evaluate(() => {
    sessionStorage.setItem("unsaved-test-data", "draft");
    window.addEventListener("beforeunload", (event) => {
      event.preventDefault();
      event.returnValue = "";
    });
  });
  let blockedReloads = 0;
  page.on("dialog", async (dialog) => {
    blockedReloads += 1;
    await dialog.dismiss();
  });
  await setServerState(request, { version: "b" });
  await advanceToPoll(page, tvInterval);
  await expectReady(page, builds.b.manifest.buildInfo);
  await expect.poll(() => blockedReloads).toBe(1);
  await expectVersion(page, "a");
  const reloadButton = page.getByRole("button", {
    name: "Reload",
    exact: true,
  });
  await expect(reloadButton).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("unsaved-test-data")),
  ).toBe("draft");
  await rpc(page, { type: "CHECK_MANIFEST" });
  await page.clock.fastForward(5_000);
  expect(blockedReloads).toBe(1);
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => void dialog.accept());
  await reloadButton.click();
  await expectVersion(page, "b");
  expect(await loadCount(page)).toBe(2);
});

test("old ready caches remain pinned by live tabs, serve removed lazy assets, and are collected after those tabs close", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const first = await openControlledPage(context, request);
  const pinned = await openControlledPage(context, request);
  await setServerState(request, { version: "b" });
  await first.reload();
  await expectVersion(first, "b");
  await expectReady(first, builds.b.manifest.buildInfo);
  const retained = await status(first);
  const oldBuild = retained.builds.find(
    (item) =>
      item.manifest.buildInfo.buildId === builds.a.manifest.buildInfo.buildId,
  )!;
  expect(oldBuild.state).toBe("ready");
  expect(
    retained.caches.some((cache) => cache.name === oldBuild.cacheName),
  ).toBe(true);
  expect((await request.get(builds.a.lazyResource)).status()).toBe(404);
  const imported = await pinned.evaluate(async () => {
    const app = globalThis as typeof globalThis & {
      __SW_TEST_LOAD_LAZY__: () => Promise<{ version: string }>;
    };
    return (await app.__SW_TEST_LOAD_LAZY__()).version;
  });
  expect(imported).toBe("a");
  await pinned.close();
  await rpc(first, { type: "CHECK_MANIFEST" });
  await expect
    .poll(async () =>
      (await status(first)).builds.some(
        (item) => item.cacheName === oldBuild.cacheName,
      ),
    )
    .toBe(false);
  expect(
    (await status(first)).caches.some(
      (cache) => cache.name === oldBuild.cacheName,
    ),
  ).toBe(false);
});

for (const failure of ["http500", "integrity"] as const) {
  test(`incomplete B (${failure}) is not promoted and offline navigation retains ready A`, async ({
    context,
    request,
  }) => {
    const builds = await getBuilds(request);
    const page = await openControlledPage(context, request);
    await setServerState(request, {
      version: "b",
      resourceStatus: failure === "http500" ? 500 : 200,
      corruptResource: failure === "integrity",
    });
    // CHECK_MANIFEST deduplicates concurrent checks. If startup already read A,
    // its deployment-change result is not evidence that B's bad chunk was tested.
    await expect
      .poll(
        async () => {
          expect(
            await rpc<BuildInfo | null>(page, { type: "CHECK_MANIFEST" }),
          ).toBeNull();
          const checked = await workerState(page);
          return checked.manifestCheck?.buildId;
        },
        { timeout: 30_000 },
      )
      .toBe(builds.b.manifest.buildInfo.buildId);
    const current = await workerState(page);
    expect(current.latestReadyBuildId).toBe(
      builds.a.manifest.buildInfo.buildId,
    );
    const failedBuild = current.builds.find(
      (item) =>
        item.manifest.buildInfo.buildId === builds.b.manifest.buildInfo.buildId,
    )!;
    expect(failedBuild.state).toBe("downloading");
    expect(failedBuild.error).toBeTruthy();
    expect(failedBuild.completed).toBeLessThan(
      failedBuild.manifest.resources.length,
    );
    await context.setOffline(true);
    await page.reload();
    await expectVersion(page, "a");
    await context.setOffline(false);
  });
}

test("a stopped worker restarts offline with durable build pins", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request, { clock: true });
  await scheduledCheck(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh snapshot", exact: true }),
  ).toBeEnabled();
  const before = await status(page);
  expect(before.latestReadyBuildId).toBeTruthy();
  const session = await context.newCDPSession(page);
  type WorkerVersion = {
    versionId: string;
    scriptURL: string;
    runningStatus: string;
    status: string;
  };
  const versions = new Map<string, WorkerVersion>();
  const lifecycle: { versionId: string; runningStatus: string }[] = [];
  session.on(
    "ServiceWorker.workerVersionUpdated",
    ({ versions: changed }: { versions: WorkerVersion[] }) => {
      for (const version of changed) {
        versions.set(version.versionId, version);
        lifecycle.push({
          versionId: version.versionId,
          runningStatus: version.runningStatus,
        });
      }
    },
  );
  await session.send("ServiceWorker.enable");
  await expect
    .poll(() =>
      [...versions.values()].some(
        (version) =>
          version.scriptURL.endsWith("/sw.js") &&
          version.status === "activated" &&
          version.runningStatus === "running",
      ),
    )
    .toBe(true);
  const version = [...versions.values()].find(
    (item) =>
      item.scriptURL.endsWith("/sw.js") &&
      item.status === "activated" &&
      item.runningStatus === "running",
  )!;
  const stopBoundary = lifecycle.length;
  await session.send("ServiceWorker.stopWorker", {
    versionId: version.versionId,
  });
  await expect
    .poll(() =>
      lifecycle
        .slice(stopBoundary)
        .some(
          (event) =>
            event.versionId === version.versionId &&
            event.runningStatus === "stopped",
        ),
    )
    .toBe(true);
  expect(versions.get(version.versionId)?.runningStatus).toBe("stopped");
  const wakeBoundary = lifecycle.length;
  await page.reload();
  await expectVersion(page, "a");
  await expect
    .poll(() =>
      lifecycle
        .slice(wakeBoundary)
        .some(
          (event) =>
            event.versionId === version.versionId &&
            event.runningStatus === "running",
        ),
    )
    .toBe(true);
  const restarted = await status(page);
  expect(restarted.generation).toBe(before.generation);
  expect(restarted.latestReadyBuildId).toBe(before.latestReadyBuildId);
  expect(
    restarted.builds.map((build) => ({
      cacheName: build.cacheName,
      state: build.state,
    })),
  ).toEqual(
    before.builds.map((build) => ({
      cacheName: build.cacheName,
      state: build.state,
    })),
  );
  expect(await loadCount(page)).toBe(2);
  await session.detach();
  await context.setOffline(false);
});

test("reset aborts delayed work and prevents old workers from recreating any cache", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  await page.evaluate(async () => {
    const unrelated = await caches.open("unrelated-test-cache");
    await unrelated.put("/__test/unrelated", new Response("remove me too"));
  });
  await setServerState(request, { version: "b", delayResource: true });
  // Start a check without waiting for the deliberately blocked lazy resource.
  await page.evaluate(() =>
    navigator.serviceWorker.controller!.postMessage({ type: "CHECK_MANIFEST" }),
  );
  await expect
    .poll(async () => (await serverSnapshot(request)).delayedResources)
    .toBeGreaterThan(0);
  const before = await status(page);
  const reset = await rpc<WorkerState>(page, { type: "RESET" });
  expect(reset.generation).toBeGreaterThan(before.generation);
  expect(reset.blocked).toBe(true);
  expect(reset.builds).toEqual([]);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await setServerState(request, { version: "b" });
  expect(await rpc(page, { type: "CHECK_MANIFEST" })).toBeNull();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
});

test("debug reset clears every old cache, unregisters, and reloads safely into a clean generation", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  const previous = await status(page);
  const previousNames = await page.evaluate(() => caches.keys());
  await page.evaluate(async () => {
    const extra = await caches.open("unrelated-debug-reset-cache");
    await extra.put("/__test/extra", new Response("stale"));
  });
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page
      .getByRole("button", {
        name: "Clear ALL caches, unregister, and reload",
        exact: true,
      })
      .click(),
  ]);
  await expect.poll(() => loadCount(page)).toBe(2);
  await expectVersion(page, "a");
  await expect(
    page.getByRole("heading", { name: "App and offline diagnostics" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect
    .poll(async () => (await status(page)).generation)
    .toBeGreaterThan(previous.generation);
  const names = await page.evaluate(() => caches.keys());
  expect(names).not.toContain("unrelated-debug-reset-cache");
  expect(names.some((name) => previousNames.includes(name))).toBe(false);
  expect((await status(page)).blocked).toBe(false);
  expect(await loadCount(page)).toBe(2);
});
