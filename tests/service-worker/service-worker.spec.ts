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
  BuildResource,
  WorkerCommand,
  WorkerDiagnosticsSnapshot,
  WorkerState,
} from "../../src/service-worker/protocol";
import {
  classifyResourceChanges,
  getResourceDownloads,
} from "./resource-downloads.mjs";

type Version = "a" | "b" | "c";
type TestBuild = {
  manifest: BuildManifest;
  lazyResource: string;
  htmlBuildLabel: number;
};
type TestBuilds = Record<Version, TestBuild>;
type ServerState = {
  version: Version;
  connectionError?: boolean;
  httpStatus?: number;
  cacheableHtml?: boolean;
  runtimeVersion?: Version;
  delayApi?: boolean;
  delayResource?: boolean;
  resourceStatus?: number;
  corruptResource?: boolean;
  clearRequests?: boolean;
};
type ServerSnapshot = ServerState & {
  delayedResources: number;
  requests: {
    url: string;
    version: Version;
    destination?: string | null;
    status?: number | null;
    bytes?: number;
  }[];
};
const normalInterval = 30 * 60_000;
const tvInterval = 60_000;
const apiOrigin = "http://127.0.0.1:5202";

/** The mock API accepts this cookie as a signed-in account. */
function signIn(context: BrowserContext, account: "sw-test" | "sw-staff") {
  return context.addCookies([
    { name: "sw-e2e-user", value: account, url: apiOrigin },
  ]);
}

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

function diagnostics(page: Page) {
  return rpc<WorkerDiagnosticsSnapshot>(page, { type: "GET_DIAGNOSTICS" });
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

async function expectOfflineBuild(
  page: Page,
  version: Version,
  build: TestBuild,
) {
  await expectVersion(page, version);
  await expect(page.locator("#debug-html-build")).toHaveText(
    `HTML · ${build.htmlBuildLabel}`,
  );
  await expect(
    page.getByText("You are offline", { exact: true }),
  ).toBeVisible();
  const reply = await diagnostics(page);
  expect(
    reply.storage.clients.find(
      (pin) => pin.clientId === reply.runtimeClients.requestingClientId,
    ),
  ).toMatchObject({
    buildId: build.manifest.buildInfo.buildId,
    navigationSource: "cache",
  });
  expect(reply.storage.latestReadyBuildId).toBe(
    build.manifest.buildInfo.buildId,
  );
  expect(
    reply.storage.builds.find(
      (cached) =>
        cached.manifest.buildInfo.buildId === build.manifest.buildInfo.buildId,
    )?.state,
  ).toBe("ready");
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

async function expectResourceDownloads(
  request: APIRequestContext,
  manifest: BuildManifest,
  expected: BuildResource[],
) {
  const downloads = getResourceDownloads(
    (await serverSnapshot(request)).requests,
    manifest,
  );
  expect(
    downloads
      .map(({ url, status, bytes }) => ({ url, status, bytes }))
      .sort((left, right) => left.url.localeCompare(right.url)),
  ).toEqual(
    expected
      .map(({ url, size }) => ({ url, status: 200, bytes: size }))
      .sort((left, right) => left.url.localeCompare(right.url)),
  );
  expect(downloads.every((item) => item.destination === "empty")).toBe(true);
  await test.info().attach("snapshot-resource-downloads", {
    body: JSON.stringify({ expected, actual: downloads }, null, 2),
    contentType: "application/json",
  });
}

async function expectSnapshotIntegrity(page: Page, manifest: BuildManifest) {
  const stored = (await workerState(page)).builds.find(
    (build) => build.manifest.buildInfo.buildId === manifest.buildInfo.buildId,
  );
  expect(stored).toMatchObject({
    state: "ready",
    completed: manifest.resources.length,
  });
  const resources = await page.evaluate(
    async ({ cacheName, resources }) => {
      const cache = await caches.open(cacheName);
      return Promise.all(
        resources.map(async (resource) => {
          const response = await cache.match(
            new URL(resource.url, location.href).href,
          );
          if (!response)
            throw new Error(`Missing cached resource: ${resource.url}`);
          const bytes = await response.arrayBuffer();
          const hash = await crypto.subtle.digest("SHA-384", bytes);
          return {
            url: resource.url,
            integrity: `sha384-${btoa(String.fromCharCode(...new Uint8Array(hash)))}`,
            size: bytes.byteLength,
          };
        }),
      );
    },
    { cacheName: stored!.cacheName, resources: manifest.resources },
  );
  expect(resources).toEqual(manifest.resources);
}

async function openControlledPage(
  context: BrowserContext,
  request: APIRequestContext,
  options: { tv?: boolean; clock?: boolean; pauseUpdates?: boolean } = {},
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
  else {
    await expect(
      page.getByRole("heading", { name: "App and offline diagnostics" }),
    ).toBeVisible();
    if (options.pauseUpdates !== false)
      await page.getByLabel("Pause automatic updates on this page").check();
  }
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

/** Stop the page's active worker through DevTools, as the browser does when idle. */
async function stopRunningWorker(context: BrowserContext, page: Page) {
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
  function findRunning() {
    return [...versions.values()].find(
      (item) =>
        item.scriptURL.endsWith("/sw.js") &&
        item.status === "activated" &&
        item.runningStatus === "running",
    );
  }
  await expect.poll(() => !!findRunning()).toBe(true);
  const { versionId } = findRunning()!;
  function reachedAfter(boundary: number, runningStatus: string) {
    return lifecycle
      .slice(boundary)
      .some(
        (event) =>
          event.versionId === versionId &&
          event.runningStatus === runningStatus,
      );
  }
  const stopBoundary = lifecycle.length;
  await session.send("ServiceWorker.stopWorker", { versionId });
  await expect.poll(() => reachedAfter(stopBoundary, "stopped")).toBe(true);
  expect(versions.get(versionId)?.runningStatus).toBe("stopped");
  const wakeBoundary = lifecycle.length;
  return {
    session,
    expectRunning: () =>
      expect.poll(() => reachedAfter(wakeBoundary, "running")).toBe(true),
  };
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
  const workerInfo = (await diagnostics(page)).worker.buildInfo;
  expect(workerInfo.serviceWorkerHash).toMatch(/^[\da-f]{64}$/);
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.status()).toBe(200);
  const workerSource = await workerResponse.text();
  // The bootstrap identity is excluded from the worker's own standalone-code hash.
  const workerCode = workerSource.slice(workerSource.indexOf("\n") + 1);
  expect(createHash("sha256").update(workerCode).digest("hex")).toBe(
    workerInfo.serviceWorkerHash,
  );
  expect(workerInfo).toEqual({
    serviceWorkerHash: workerInfo.serviceWorkerHash,
  });
  // The commit and build time are recorded only in the manifest.
  expect(builds.a.manifest.commitHash).toMatch(/^[\da-f]{40}$/);
  expect(Number.isNaN(Date.parse(builds.a.manifest.builtAt))).toBe(false);

  expect(
    new Set(
      Object.values(builds).map((item) => item.manifest.buildInfo.buildId),
    ).size,
  ).toBe(3);
  for (const version of ["a", "b", "c"] as const) {
    await setServerState(request, { version });
    const manifest = builds[version].manifest;
    expect(manifest.schemaVersion).toBe(1);
    expect(
      manifest.resources.some((item) => item.url === manifest.entrypoint),
    ).toBe(true);
    // Named per build, so no cache can pair it with another build's HTML.
    const infoUrl = `/assets/build-info-${manifest.buildInfo.buildId}.js`;
    expect(manifest.resources.map((item) => item.url)).toContain(infoUrl);
    const { version: appVersion, buildId } = manifest.buildInfo;
    expect(await (await request.get(infoUrl)).text()).toBe(
      `globalThis.BUILD_INFO = ${JSON.stringify({ version: appVersion, buildId })};\n`,
    );
    // buildId hashes the version and every file, while index.html still had a
    // placeholder instead of the id and the build-info file did not exist yet.
    const html = Buffer.from(
      (await (await request.get("/index.html")).text()).replaceAll(
        buildId,
        "__BUILD_ID__",
      ),
    );
    const hashedResources = manifest.resources
      .filter((item) => item.url !== infoUrl)
      .map((item) =>
        item.url === "/index.html"
          ? {
              url: item.url,
              integrity: `sha384-${createHash("sha384").update(html).digest("base64")}`,
              size: html.byteLength,
            }
          : item,
      );
    expect(
      createHash("sha256")
        .update(
          JSON.stringify({ version: appVersion, resources: hashedResources }),
        )
        .digest("hex")
        .slice(0, 16),
    ).toBe(buildId);
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

test("updates A → B → C download only changed/new resources and ready rechecks download none", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  let previous = builds.a.manifest;
  for (const version of ["b", "c"] as const) {
    const manifest = builds[version].manifest;
    const { unchanged, updated } = classifyResourceChanges(previous, manifest);
    expect(unchanged.length).toBeGreaterThan(0);
    expect(updated.length).toBeGreaterThan(0);
    // Cover changed content at stable URLs, as well as newly hashed JS assets.
    expect(updated.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([
        "/index.html",
        `/assets/build-info-${manifest.buildInfo.buildId}.js`,
        builds[version].lazyResource,
      ]),
    );
    expect(
      updated.some(
        (resource) =>
          !previous.resources.some((old) => old.url === resource.url),
      ),
    ).toBe(true);
    await setServerState(request, { version, clearRequests: true });
    expect(await rpc(page, { type: "CHECK_MANIFEST" })).toEqual(
      manifest.buildInfo,
    );
    await expectReady(page, manifest.buildInfo);
    await expectResourceDownloads(request, manifest, updated);
    await expectSnapshotIntegrity(page, manifest);
    console.info(
      `[SW ${version}] ${updated.length}/${manifest.resources.length} files downloaded (${updated.reduce((bytes, resource) => bytes + resource.size, 0)} body bytes); ${unchanged.length} reused from Cache Storage.`,
    );

    await setServerState(request, { version, clearRequests: true });
    await rpc(page, { type: "CHECK_MANIFEST" });
    await expectResourceDownloads(request, manifest, []);
    expect(
      (await serverSnapshot(request)).requests.some(
        (item) => item.url === "/build-manifest.json",
      ),
    ).toBe(true);
    previous = manifest;
  }
  await expectVersion(page, "a");
  expect(await loadCount(page)).toBe(1);
});

test("a new tab and its lazy JS use a ready snapshot without downloading its files again", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const first = await openControlledPage(context, request);
  await setServerState(request, { version: "b" });
  await rpc(first, { type: "CHECK_MANIFEST" });
  await expectReady(first, builds.b.manifest.buildInfo);
  await setServerState(request, { version: "b", clearRequests: true });
  const page = await context.newPage();
  await page.goto("/debug");
  await expectVersion(page, "b");
  const lazyVersion = await page.evaluate(async () => {
    const app = globalThis as typeof globalThis & {
      __SW_TEST_LOAD_LAZY__: () => Promise<{ version: string }>;
    };
    return (await app.__SW_TEST_LOAD_LAZY__()).version;
  });
  expect(lazyVersion).toBe("b");
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectResourceDownloads(request, builds.b.manifest, []);
  expect(
    (await serverSnapshot(request)).requests.some(
      (item) => item.url === "/debug",
    ),
  ).toBe(true);
});

for (const damage of ["missing", "corrupt"] as const) {
  test(`only the changed files and a ${damage} shared resource are downloaded`, async ({
    context,
    request,
  }) => {
    const builds = await getBuilds(request);
    const page = await openControlledPage(context, request);
    const { unchanged, updated } = classifyResourceChanges(
      builds.a.manifest,
      builds.b.manifest,
    );
    const shared = unchanged.find((resource) => resource.url.endsWith(".css"));
    if (!shared) throw new Error("Fixture builds must share a stylesheet");
    const cached = (await workerState(page)).builds.find(
      (build) =>
        build.manifest.buildInfo.buildId ===
        builds.a.manifest.buildInfo.buildId,
    )!;
    await page.evaluate(
      async ({ cacheName, url, damage }) => {
        const cache = await caches.open(cacheName);
        const absoluteUrl = new URL(url, location.href).href;
        if (damage === "missing") {
          if (!(await cache.delete(absoluteUrl)))
            throw new Error("Shared resource was not cached");
          return;
        }
        await cache.put(
          absoluteUrl,
          new Response("corrupted cached stylesheet", {
            headers: { "Content-Type": "text/css" },
          }),
        );
      },
      { cacheName: cached.cacheName, url: shared.url, damage },
    );
    await setServerState(request, { version: "b", clearRequests: true });
    await rpc(page, { type: "CHECK_MANIFEST" });
    await expectReady(page, builds.b.manifest.buildInfo);
    await expectResourceDownloads(request, builds.b.manifest, [
      ...updated,
      shared,
    ]);
    await expectSnapshotIntegrity(page, builds.b.manifest);
  });
}

test("retrying an interrupted snapshot downloads only the unfinished resource", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  const manifest = builds.b.manifest;
  await setServerState(request, {
    version: "b",
    delayResource: true,
    resourceStatus: 500,
  });
  const pendingCheck = rpc(page, { type: "CHECK_MANIFEST" });
  await expect
    .poll(async () => (await serverSnapshot(request)).delayedResources)
    .toBeGreaterThan(0);
  await expect
    .poll(
      async () =>
        (await workerState(page)).builds.find(
          (build) =>
            build.manifest.buildInfo.buildId === manifest.buildInfo.buildId,
        )?.completed,
      { timeout: 30_000 },
    )
    .toBe(manifest.resources.length - 1);
  await setServerState(request, { version: "b", resourceStatus: 500 });
  expect(await pendingCheck).toBeNull();
  expect((await workerState(page)).latestReadyBuildId).toBe(
    builds.a.manifest.buildInfo.buildId,
  );
  const unfinished = manifest.resources.find(
    (resource) => resource.url === builds.b.lazyResource,
  )!;
  await setServerState(request, { version: "b", clearRequests: true });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, manifest.buildInfo);
  await expectResourceDownloads(request, manifest, [unfinished]);
  await expectSnapshotIntegrity(page, manifest);
});

test("the HTML build marker is baked into every build without JavaScript", async ({
  browser,
  request,
}) => {
  const builds = await getBuilds(request);
  const staticContext = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL,
  });
  try {
    const page = await staticContext.newPage();
    const labels = new Set<string>();
    for (const version of ["a", "b", "c"] as const) {
      await setServerState(request, { version });
      const response = await page.goto("/debug");
      expect(response?.status()).toBe(200);
      const marker = page.locator("#debug-html-build");
      const label = `HTML · ${builds[version].htmlBuildLabel}`;
      await expect(marker).toHaveText(label);
      await expect(marker).toHaveAttribute(
        "title",
        builds[version].manifest.builtAt,
      );
      await expect(page.locator("#debug-title")).toHaveCount(0);
      labels.add(label);
    }
    expect(labels.size).toBe(3);
  } finally {
    await staticContext.close();
  }
});

test("Debug displays the document's static HTML marker next to its title until reload", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  const marker = page.locator("#debug-html-build");
  const title = page.locator("#debug-title");
  const labelA = `HTML · ${builds.a.htmlBuildLabel}`;
  const labelB = `HTML · ${builds.b.htmlBuildLabel}`;
  await expect(marker).toHaveText(labelA);
  await expect(marker).toBeVisible();
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const titleBox = await title.boundingBox();
    const markerBox = await marker.boundingBox();
    if (!titleBox || !markerBox)
      throw new Error("Debug title or static HTML marker has no layout box");
    expect(markerBox.x - (titleBox.x + titleBox.width)).toBeCloseTo(8, 0);
    expect(
      Math.abs(
        markerBox.y + markerBox.height / 2 - (titleBox.y + titleBox.height / 2),
      ),
    ).toBeLessThan(2);
    expect(markerBox.x + markerBox.width).toBeLessThanOrEqual(width);
  }

  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.b.manifest.buildInfo);
  await page
    .getByRole("button", { name: "Refresh snapshot", exact: true })
    .click();
  await expect(marker).toHaveText(labelA);
  await page.reload();
  await expect(marker).toHaveText(labelB);
  await expect(marker).toBeVisible();
  await page.goto("/maps");
  await expect(marker).toHaveText(labelB);
  await expect(marker).toBeHidden();
});

test("diagnostics keep App, browser roles, worker reports, and live tabs separate", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const oldPage = await openControlledPage(context, request);
  const oldReply = await diagnostics(oldPage);
  const oldClientId = oldReply.runtimeClients.requestingClientId;
  expect(oldClientId).not.toBeNull();
  expect(oldReply.runtimeClients.windows).toContainEqual(
    expect.objectContaining({ id: oldClientId, controlled: true }),
  );
  const oldPin = oldReply.storage.clients.find(
    (pin) => pin.clientId === oldClientId,
  );
  expect(oldPin?.lastHello?.message).toMatchObject({
    type: "CLIENT_HELLO",
    buildId: builds.a.manifest.buildInfo.buildId,
    pathname: "/debug",
  });
  expect(oldPin?.lastHello?.receivedBy).toEqual({
    scriptURL: oldReply.worker.scriptURL,
    serviceWorkerHash: oldReply.worker.buildInfo.serviceWorkerHash,
  });

  await setServerState(request, { version: "b" });
  const newPage = await context.newPage();
  await newPage.goto("/debug");
  await expectVersion(newPage, "b");
  await rpc(newPage, { type: "CHECK_MANIFEST" });
  await expectReady(newPage, builds.b.manifest.buildInfo);
  const newReply = await diagnostics(newPage);
  expect(newReply.runtimeClients.requestingClientId).not.toBe(oldClientId);
  expect(newReply.runtimeClients.windows.map((client) => client.id)).toEqual(
    expect.arrayContaining([
      oldClientId,
      newReply.runtimeClients.requestingClientId,
    ]),
  );

  const refresh = oldPage.getByRole("button", {
    name: "Refresh snapshot",
    exact: true,
  });
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await expect(oldPage.locator("section[id^='worker-']")).toHaveCount(1);
  await expect(
    oldPage.locator("#worker-1").getByText("controlling", { exact: true }),
  ).toBeVisible();
  await expect(
    oldPage.locator("#worker-1").getByText("active", { exact: true }),
  ).toBeVisible();
  const selectedManifest = oldPage
    .getByRole("heading", {
      name: "Manifest selected for this page",
      exact: true,
    })
    .locator("..")
    .locator("..");
  await expect(selectedManifest).toContainText(
    builds.a.manifest.buildInfo.buildId,
  );
  await expect(selectedManifest).not.toContainText(
    builds.b.manifest.buildInfo.buildId,
  );
  await expect(
    selectedManifest.getByText(
      "Stored manifest metadata matches this App's BUILD_INFO.",
      { exact: true },
    ),
  ).toBeVisible();
  const tabs = oldPage
    .getByRole("heading", { name: "Tabs known to this worker", exact: true })
    .locator("..")
    .locator("..");
  await expect(tabs.locator("article")).toHaveCount(2);
  await expect(tabs).toContainText(builds.a.manifest.buildInfo.buildId);
  await expect(tabs).toContainText(builds.b.manifest.buildInfo.buildId);
  const current = await diagnostics(oldPage);
  expect(current.storage.latestReadyBuildId).toBe(
    builds.b.manifest.buildInfo.buildId,
  );
  expect(
    current.storage.clients.find(
      (pin) => pin.clientId === current.runtimeClients.requestingClientId,
    )?.buildId,
  ).toBe(builds.a.manifest.buildInfo.buildId);
  await oldPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await oldPage.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await oldPage.evaluate(() =>
    localStorage.setItem("locale", JSON.stringify("ru")),
  );
  await oldPage.reload();
  await expect(
    oldPage.getByRole("heading", { name: "Взгляд App", exact: true }),
  ).toBeVisible();
  await expect(
    oldPage.getByRole("heading", {
      name: "Что эта App знает о себе",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    oldPage.getByRole("heading", {
      name: "Регистрации и роли воркеров",
      exact: true,
    }),
  ).toBeVisible();
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
  const downloading = await workerState(page);
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
    await expectOfflineBuild(page, "b", builds.b);
    await expectReady(page, builds.b.manifest.buildInfo);
    expect(await page.evaluate(() => navigator.onLine)).toBe(
      failure !== "offline",
    );
    if (failure === "offline") await context.setOffline(false);
  });
}

test("explicitly paused Debug keeps A while polling warms B; manual and new tabs receive B", async ({
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

test("Debug updates by default without a route allowlist or an active useAutoUpdateBlocker", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request, {
    pauseUpdates: false,
  });
  await expect(
    page.getByLabel("Pause automatic updates on this page"),
  ).not.toBeChecked();
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectVersion(page, "b");
  expect(await loadCount(page)).toBe(2);
});

test("disabling useAutoUpdateBlocker applies a pending build on the same page without dialogs", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.b.manifest.buildInfo);
  await expectVersion(page, "a");
  expect(await loadCount(page)).toBe(1);
  await page.getByLabel("Pause automatic updates on this page").uncheck();
  await expectVersion(page, "b");
  await expect(page).toHaveURL(/\/debug$/);
  await expect(
    page.getByLabel("Pause automatic updates on this page"),
  ).not.toBeChecked();
  expect(await loadCount(page)).toBe(2);
  expect(dialogs).toBe(0);
});

for (const pathname of ["/forms", "/timer"] as const) {
  test(`an idle ${pathname} component allows automatic updates by default`, async ({
    context,
    request,
  }) => {
    await signIn(context, "sw-staff");
    const page = await openControlledPage(context, request);
    await page.locator(`aside a[href="${pathname}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${pathname}$`));
    await setServerState(request, { version: "b" });
    await rpc(page, { type: "CHECK_MANIFEST" });
    await expectVersion(page, "b");
    expect(await loadCount(page)).toBe(2);
  });
}

test("an idle viewing page auto-updates once only after B is completely ready", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await setServerState(request, { version: "b", delayResource: true });
  await page.evaluate(() =>
    navigator.serviceWorker.controller!.postMessage({ type: "CHECK_MANIFEST" }),
  );
  await expect
    .poll(async () => (await serverSnapshot(request)).delayedResources)
    .toBeGreaterThan(0);
  await expectVersion(page, "a");
  expect(await loadCount(page)).toBe(1);
  await setServerState(request, { version: "b" });
  await expectVersion(page, "b");
  await expectReady(page, builds.b.manifest.buildInfo);
  expect(await loadCount(page)).toBe(2);
  await rpc(page, { type: "CHECK_MANIFEST" });
  await page.waitForTimeout(1500);
  expect(await loadCount(page)).toBe(2);
  expect(dialogs).toBe(0);
});

test("a tab that missed the announcement checks for a deployment as soon as it is back online", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  // B is deployed while this, the only tab, is offline: nothing checks the
  // server, and the 30-minute poll does not run during the test.
  await context.setOffline(true);
  await setServerState(request, { version: "b" });
  await page.waitForTimeout(500);
  await expectVersion(page, "a");
  // A real "online" event, like returning to a tab, starts a check at once.
  await context.setOffline(false);
  await expectVersion(page, "b");
  await expectReady(page, builds.b.manifest.buildInfo);
  expect(await loadCount(page)).toBe(2);
});

test("a standalone navigation guard does not implicitly register an auto-update blocker", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/about"]').click();
  await page.evaluate(() =>
    (
      globalThis as typeof globalThis & {
        __SW_TEST_ADD_NAVIGATION_BLOCKER__: () => void;
      }
    ).__SW_TEST_ADD_NAVIGATION_BLOCKER__(),
  );
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectVersion(page, "b");
  await expectReady(page, builds.b.manifest.buildInfo);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("sw-test-navigation-blocker-calls"),
    ),
  ).toBe("0");
  expect(await loadCount(page)).toBe(2);
  expect(dialogs).toBe(0);
});

test("using a control no longer implicitly blocks automatic updates", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/about"]').click();
  await page.locator("aside > button").click();
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectVersion(page, "b");
  await expectReady(page, builds.b.manifest.buildInfo);
  await expect(page).toHaveURL(/\/about$/);
  expect(await loadCount(page)).toBe(2);
});

test("the Maps component blocks updates for a draft and releases them when it is cleared", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/maps"]').click();
  const search = page.getByPlaceholder("Search any place", { exact: true });
  await search.fill("A query not submitted yet");
  await search.blur();
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.b.manifest.buildInfo);
  await page.waitForTimeout(1500);
  await expectVersion(page, "a");
  await expect(search).toHaveValue("A query not submitted yet");
  expect(await loadCount(page)).toBe(1);
  await search.fill("");
  await expectVersion(page, "b");
  await expect(page).toHaveURL(/\/maps$/);
  expect(await loadCount(page)).toBe(2);
});

test("a form draft stays on A without dialogs; leaving it for a safe route applies B", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  await signIn(context, "sw-staff");
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/forms"]').click();
  const formUrl = page.getByLabel("Form URL", { exact: true });
  await formUrl.fill("https://forms.yandex.ru/unsaved-draft");
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.b.manifest.buildInfo);
  await page.waitForTimeout(1500);
  await expectVersion(page, "a");
  await expect(formUrl).toHaveValue("https://forms.yandex.ru/unsaved-draft");
  expect(await loadCount(page)).toBe(1);
  expect(dialogs).toBe(0);
  await page.locator('aside a[href="/about"]').click();
  await expectVersion(page, "b");
  await expect(page).toHaveURL(/\/about$/);
  expect(await loadCount(page)).toBe(2);
});

for (const paused of [false, true]) {
  test(`${paused ? "paused" : "running"} timer and its title are not interrupted by B`, async ({
    context,
    request,
  }) => {
    const builds = await getBuilds(request);
    const page = await openControlledPage(context, request);
    await page.locator('aside a[href="/timer"]').click();
    await page
      .getByPlaceholder("Timer title...")
      .fill("Do not interrupt this timer");
    await page.getByRole("button", { name: "30 mins", exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    if (paused)
      await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("timerState")!).isPaused,
        ),
      )
      .toBe(paused);
    let dialogs = 0;
    page.on("dialog", (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });
    await setServerState(request, { version: "b" });
    await rpc(page, { type: "CHECK_MANIFEST" });
    await expectReady(page, builds.b.manifest.buildInfo);
    await page.waitForTimeout(1500);
    await expectVersion(page, "a");
    await expect(page.getByPlaceholder("Timer title...")).toHaveValue(
      "Do not interrupt this timer",
    );
    await expect(
      page.getByRole("button", {
        name: paused ? "Resume" : "Pause",
        exact: true,
      }),
    ).toBeVisible();
    expect(await loadCount(page)).toBe(1);
    expect(dialogs).toBe(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("timerState")!).isRunning,
      ),
    ).toBe(true);
  });
}

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
  expect((await workerState(page)).latestReadyBuildId).toBe(
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
  const retained = await diagnostics(first);
  const oldBuild = retained.storage.builds.find(
    (item) =>
      item.manifest.buildInfo.buildId === builds.a.manifest.buildInfo.buildId,
  )!;
  expect(oldBuild.state).toBe("ready");
  expect(
    retained.cacheStorage.some((cache) => cache.name === oldBuild.cacheName),
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
      (await workerState(first)).builds.some(
        (item) => item.cacheName === oldBuild.cacheName,
      ),
    )
    .toBe(false);
  expect(
    (await diagnostics(first)).cacheStorage.some(
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
    await expectOfflineBuild(page, "a", builds.a);
    await context.setOffline(false);
  });
}

for (const failure of ["offline", "connection", "http500"] as const) {
  test(`connection lost during B download (${failure}) reloads complete A with an offline banner`, async ({
    context,
    request,
  }) => {
    const builds = await getBuilds(request);
    const page = await openControlledPage(context, request);
    await setServerState(request, { version: "b", delayResource: true });
    // A manual document load can show B before its offline snapshot is ready.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectVersion(page, "b");
    await expect
      .poll(async () => (await serverSnapshot(request)).delayedResources)
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          (await workerState(page)).builds.find(
            (build) =>
              build.manifest.buildInfo.buildId ===
              builds.b.manifest.buildInfo.buildId,
          )?.completed ?? 0,
      )
      .toBeGreaterThan(0);
    const partial = (await workerState(page)).builds.find(
      (build) =>
        build.manifest.buildInfo.buildId ===
        builds.b.manifest.buildInfo.buildId,
    )!;
    expect(partial.state).toBe("downloading");
    expect(partial.completed).toBeLessThan(partial.manifest.resources.length);

    if (failure === "offline") await context.setOffline(true);
    // Release the pending response into a real transport failure or HTTP error.
    await setServerState(request, {
      version: "b",
      connectionError: failure !== "http500",
      httpStatus: failure === "http500" ? 500 : 200,
      resourceStatus: failure === "http500" ? 500 : 200,
    });
    await expect
      .poll(
        async () =>
          (await workerState(page)).builds.find(
            (build) =>
              build.manifest.buildInfo.buildId ===
              builds.b.manifest.buildInfo.buildId,
          )?.error,
      )
      .toBeTruthy();
    await page.reload();
    await expectOfflineBuild(page, "a", builds.a);
    const after = await workerState(page);
    const failedBuild = after.builds.find(
      (build) =>
        build.manifest.buildInfo.buildId ===
        builds.b.manifest.buildInfo.buildId,
    )!;
    expect(failedBuild.state).toBe("downloading");
    expect(failedBuild.completed).toBeLessThan(
      failedBuild.manifest.resources.length,
    );
    expect(after.latestReadyBuildId).toBe(builds.a.manifest.buildInfo.buildId);
    expect(await loadCount(page)).toBe(3);
    if (failure === "offline") await context.setOffline(false);
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
  const before = await workerState(page);
  expect(before.latestReadyBuildId).toBeTruthy();
  const worker = await stopRunningWorker(context, page);
  await page.reload();
  await expectVersion(page, "a");
  await worker.expectRunning();
  const restarted = await workerState(page);
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
  await worker.session.detach();
  await context.setOffline(false);
});

test("a restarted worker finishes a reset that was interrupted mid-purge", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  const before = await workerState(page);
  expect(await page.evaluate(() => caches.keys())).not.toEqual([]);
  // The state purgeWorkerCaches persists before deleting caches, as if it crashed there.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("innohassle-service-worker", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const transaction = open.result.transaction("state", "readwrite");
          const store = transaction.objectStore("state");
          const read = store.get("current");
          read.onsuccess = () =>
            store.put(
              { ...read.result, blocked: true, resetPending: true },
              "current",
            );
          transaction.oncomplete = () => {
            open.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );
  const worker = await stopRunningWorker(context, page);
  // Any event restarts the worker; recovery runs before it answers commands.
  const recovered = await workerState(page);
  await worker.expectRunning();
  expect(recovered).toMatchObject({
    generation: before.generation,
    blocked: true,
    resetPending: false,
  });
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await worker.session.detach();
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
  const before = await diagnostics(page);
  const reset = await rpc<WorkerState>(page, { type: "RESET" });
  expect(reset.generation).toBeGreaterThan(before.storage.generation);
  expect(reset.blocked).toBe(true);
  expect(reset.builds).toEqual([]);
  expect((await diagnostics(page)).worker.buildInfo).toEqual(
    before.worker.buildInfo,
  );
  // The worker announces the reset on the shared channel; open pages stop automatic work.
  await page
    .getByRole("button", { name: "Refresh snapshot", exact: true })
    .click();
  const section = (name: string) =>
    page
      .getByRole("heading", { name, exact: true })
      .locator("..")
      .locator("..");
  await expect(section("Automatic update")).toContainText("stopped");
  await expect(
    section("Last worker notification observed by this App"),
  ).toContainText("CACHE_INVALIDATED");
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
  const previous = await workerState(page);
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
    .poll(async () => (await workerState(page)).generation)
    .toBeGreaterThan(previous.generation);
  const names = await page.evaluate(() => caches.keys());
  expect(names).not.toContain("unrelated-debug-reset-cache");
  expect(names.some((name) => previousNames.includes(name))).toBe(false);
  expect((await workerState(page)).blocked).toBe(false);
  expect(await loadCount(page)).toBe(2);
});

test("navigations revalidate HTML even when the server allows caching it", async ({
  context,
  request,
}) => {
  await setServerState(request, { version: "a", cacheableHtml: true });
  const page = await openControlledPage(context, request);
  // The worker's own HTTP fetch now has a fresh copy of /about from build A.
  await page.goto("/about");
  await expectVersion(page, "a");
  await page.goto("/debug");
  await setServerState(request, { version: "b", cacheableHtml: true });
  const loads = await loadCount(page);
  await page.goto("/about");
  // The navigation itself must deliver B; an automatic update would reload later.
  expect(await page.locator("html").getAttribute("data-sw-test-version")).toBe(
    "b",
  );
  expect(await loadCount(page)).toBe(loads + 1);
});

async function fetchApi(page: Page, path: string) {
  return page.evaluate(async (url) => {
    try {
      const response = await fetch(url, { credentials: "include" });
      return `${response.status} ${await response.text()}`;
    } catch {
      return "network error";
    }
  }, `${apiOrigin}${path}`);
}

async function cachedApiUrls(page: Page, cacheName: string) {
  return page.evaluate(async (name) => {
    if (!(await caches.has(name))) return [];
    const keys = await (await caches.open(name)).keys();
    return keys.map((key) => new URL(key.url).pathname);
  }, cacheName);
}

test("calendar, account and maps API responses are cached for offline use", async ({
  context,
  request,
}) => {
  // Signed in, so the app does not treat the visitor as logged out and clear the cache.
  await signIn(context, "sw-test");
  const page = await openControlledPage(context, request);
  expect(await fetchApi(page, "/accounts/tokens/generate-my-token")).toMatch(
    /^200 /,
  );
  expect(await fetchApi(page, "/schedule/feed.ics")).toContain(
    "Offline algorithms a",
  );
  expect(await fetchApi(page, "/schedule/users/me")).toMatch(/^200 /);
  expect(await fetchApi(page, "/accounts/users/me")).toMatch(/^200 /);
  expect(await fetchApi(page, "/maps/scenes/")).toContain("University a");
  expect(await fetchApi(page, "/schedule/tags/")).toMatch(/^200 /);
  await expect
    .poll(() => cachedApiUrls(page, "api-user-data"))
    .toEqual(
      expect.arrayContaining([
        "/schedule/feed.ics",
        "/schedule/users/me",
        "/accounts/users/me",
      ]),
    );
  // Uncached: unrelated API calls and access tokens.
  expect(await cachedApiUrls(page, "api-user-data")).not.toContain(
    "/schedule/tags/",
  );
  expect(await cachedApiUrls(page, "api-user-data")).not.toContain(
    "/accounts/tokens/generate-my-token",
  );
  await expect
    .poll(() => cachedApiUrls(page, "api-maps"))
    .toEqual(["/maps/scenes/"]);

  // Online, the user's data comes from the network; maps first from the cache.
  await setServerState(request, { version: "a", runtimeVersion: "b" });
  expect(await fetchApi(page, "/schedule/feed.ics")).toContain(
    "Offline algorithms b",
  );
  expect(await fetchApi(page, "/maps/scenes/")).toContain("University a");
  await expect
    .poll(() => fetchApi(page, "/maps/scenes/"))
    .toContain("University b");

  // A slow network falls back to the cached copy after the timeout.
  await setServerState(request, {
    version: "a",
    runtimeVersion: "c",
    delayApi: true,
  });
  const startedAt = Date.now();
  expect(await fetchApi(page, "/schedule/feed.ics")).toContain(
    "Offline algorithms b",
  );
  expect(Date.now() - startedAt).toBeLessThan(10_000);
  await setServerState(request, { version: "a", runtimeVersion: "b" });

  await context.setOffline(true);
  expect(await fetchApi(page, "/schedule/feed.ics")).toContain(
    "Offline algorithms b",
  );
  expect(await fetchApi(page, "/schedule/users/me")).toContain(
    "Service Worker Test",
  );
  expect(await fetchApi(page, "/accounts/users/me")).toContain("sw-test");
  expect(await fetchApi(page, "/maps/scenes/")).toContain("University b");
  expect(await fetchApi(page, "/schedule/tags/")).toBe("network error");
  await context.setOffline(false);
});

test("logging out deletes the user's cached API responses but keeps maps", async ({
  context,
  request,
}) => {
  await signIn(context, "sw-test");
  const page = await openControlledPage(context, request);
  await fetchApi(page, "/schedule/users/me");
  await fetchApi(page, "/maps/scenes/");
  await expect
    .poll(() => cachedApiUrls(page, "api-user-data"))
    .toContain("/schedule/users/me");
  await expect
    .poll(() => cachedApiUrls(page, "api-maps"))
    .toEqual(["/maps/scenes/"]);
  await context.clearCookies();
  await page.reload();
  await expectVersion(page, "a");
  await expect.poll(() => cachedApiUrls(page, "api-user-data")).toEqual([]);
  expect(await cachedApiUrls(page, "api-maps")).toEqual(["/maps/scenes/"]);
});

test("a worker start removes caches it does not own, such as the former Workbox ones", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  const buildCaches = await page.evaluate(() => caches.keys());
  await page.evaluate(async () => {
    for (const name of [
      "workbox-precache-v2-http://127.0.0.1:5201/",
      "calendar-feeds",
      "maps",
    ])
      await (await caches.open(name)).put("/__test/old", new Response("old"));
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("workbox-expiration", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("entries");
      open.onsuccess = () => {
        open.result.close();
        resolve();
      };
      open.onerror = () => reject(open.error);
    });
  });
  const worker = await stopRunningWorker(context, page);
  await workerState(page);
  await worker.expectRunning();
  expect((await page.evaluate(() => caches.keys())).sort()).toEqual(
    buildCaches.sort(),
  );
  await expect
    .poll(async () =>
      (await page.evaluate(() => indexedDB.databases())).map(
        (database) => database.name,
      ),
    )
    .not.toContain("workbox-expiration");
  await worker.session.detach();
});

test("API caches keep the 128 most recently saved responses", async ({
  context,
  request,
}) => {
  await signIn(context, "sw-test");
  const page = await openControlledPage(context, request);
  const feeds = (from: number, to: number) =>
    Array.from(
      { length: to - from },
      (_, index) => `/schedule/feed-${from + index}.ics`,
    );
  async function fetchFeeds(paths: string[]) {
    for (const path of paths)
      expect(await fetchApi(page, path)).toMatch(/^200 /);
  }
  await fetchFeeds(feeds(0, 128));
  await expect
    .poll(async () => (await cachedApiUrls(page, "api-user-data")).length)
    .toBe(128);
  // Saving again (each online view does) moves an entry to the end.
  await fetchFeeds(["/schedule/feed-0.ics"]);
  await expect
    .poll(async () => (await cachedApiUrls(page, "api-user-data")).at(-1))
    .toBe("/schedule/feed-0.ics");
  await fetchFeeds(["/schedule/feed-128.ics"]);
  await expect
    .poll(() => cachedApiUrls(page, "api-user-data"))
    .toContain("/schedule/feed-128.ics");
  const cached = await cachedApiUrls(page, "api-user-data");
  expect(cached).toHaveLength(128);
  expect(cached).toContain("/schedule/feed-0.ics");
  expect(cached).not.toContain("/schedule/feed-1.ics");
});

test("rebuilding the same code from another commit produces identical files", async ({
  request,
}) => {
  const response = await request.get("/__test/rebuilds");
  expect(response.ok()).toBe(true);
  const [first, second]: BuildManifest[] = await response.json();
  expect(first.commitHash).not.toBe(second.commitHash);
  expect(second.buildInfo).toEqual(first.buildInfo);
  expect(second.resources).toEqual(first.resources);
});

test("tabs also switch automatically when the server rolls back to an older build", async ({
  context,
  request,
}) => {
  const page = await openControlledPage(context, request);
  await page.locator('aside a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  for (const version of ["b", "a"] as const) {
    await setServerState(request, { version });
    // Not awaited through RPC: the page reloads as soon as the build is ready.
    await page.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({
        type: "CHECK_MANIFEST",
      }),
    );
    await expectVersion(page, version);
  }
  expect(await loadCount(page)).toBe(3);
});

test("offline navigation skips a ready build that lost a file and serves the previous complete one", async ({
  context,
  request,
}) => {
  const builds = await getBuilds(request);
  // This paused tab keeps build A pinned, so it stays as a complete fallback.
  const page = await openControlledPage(context, request);
  await setServerState(request, { version: "b" });
  await rpc(page, { type: "CHECK_MANIFEST" });
  await expectReady(page, builds.b.manifest.buildInfo);
  const findB = (state: WorkerState) =>
    state.builds.find(
      (build) =>
        build.manifest.buildInfo.buildId ===
        builds.b.manifest.buildInfo.buildId,
    );
  const { cacheName } = findB(await workerState(page))!;
  expect(
    await page.evaluate(
      async ({ cacheName, url }) =>
        (await caches.open(cacheName)).delete(new URL(url, location.href).href),
      { cacheName, url: builds.b.lazyResource },
    ),
  ).toBe(true);
  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("/debug");
  await expectOfflineBuild(offline, "a", builds.a);
  expect(findB(await workerState(offline))).toMatchObject({
    state: "downloading",
    error: "Cached snapshot is missing files",
  });
  await context.setOffline(false);
});
