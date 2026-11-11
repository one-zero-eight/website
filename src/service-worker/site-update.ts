/**
 * Site update feature: keep complete offline snapshots of the SPA.
 *
 * Model:
 * - Online navigations always prefer the network (users see the newest HTML
 *   immediately, even while that build is still downloading into Cache Storage).
 * - A build becomes `ready` only after every manifest resource passes integrity.
 * - Offline / connection errors / 5xx navigations fall back to the latest
 *   *complete* ready snapshot — never to a partial download.
 * - Old ready caches stay while a live tab is pinned to them; otherwise they
 *   are collected once another build is the latest ready one.
 */
import type {
  BuildInfo,
  BuildManifest,
  BuildReadyNotification,
  BuildResource,
  CachedBuild,
  ClientHelloCommand,
  ClientHelloReply,
  ClientPin,
  WorkerBuildInfo,
  WorkerState,
} from "./protocol.ts";
import {
  inspectWorkerState,
  readWorkerState,
  withWorkerState,
} from "./storage.ts";

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_INFO: WorkerBuildInfo;

const scopeUrl = new URL(self.registration.scope);
const manifestUrl = new URL("build-manifest.json", scopeUrl).href;

const downloadConcurrency = 4;
/** How long a navigation pin protects its build before the page reports itself. */
const navigationPinLifetime = 60_000;

/** Deduplicate concurrent CHECK_MANIFEST / navigate-triggered downloads. */
let checkPromise: Promise<BuildInfo | null> | null = null;
/** The download of the single running check; RESET aborts it. */
let activeDownload: AbortController | null = null;

/** Abort in-flight downloads so a late put cannot recreate wiped storage. */
export function abortDownloads() {
  activeDownload?.abort();
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Service worker operation failed";
}

/** Tabs that just navigated may not have a controller yet, so include uncontrolled ones. */
async function broadcast(message: BuildReadyNotification) {
  for (const client of await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  }))
    client.postMessage(message);
}

function absoluteUrl(url: string) {
  return new URL(url, scopeUrl).href;
}

function findBuild(state: WorkerState, buildId: string | null | undefined) {
  return state.builds.find(
    (build) => build.manifest.buildInfo.buildId === buildId,
  );
}

/** Work started before a reset must not write into freshly wiped storage. */
function assertGeneration(state: WorkerState, generation: number) {
  if (state.generation !== generation || state.blocked)
    throw new Error("Cache generation changed");
}

/** Replace the client's previous pin. */
function pinClient(state: WorkerState, pin: ClientPin) {
  state.clients = state.clients.filter(
    (item) => item.clientId !== pin.clientId,
  );
  state.clients.push(pin);
}

/** Pin the document being navigated to before it can send CLIENT_HELLO. */
function pinNavigation(
  state: WorkerState,
  event: FetchEvent,
  buildId: string,
  navigationSource: "network" | "cache",
) {
  if (!event.resultingClientId) return;
  pinClient(state, {
    clientId: event.resultingClientId,
    buildId,
    navigationSource,
    pathname: new URL(event.request.url).pathname,
    interval: 0,
    nextCheckAt: null,
    reservedAt: Date.now(),
  });
}

async function digestMatches(response: Response, resource: BuildResource) {
  const bytes = await response.clone().arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-384", bytes);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return (
    resource.integrity === `sha384-${base64}` &&
    bytes.byteLength === resource.size
  );
}

/** Match a build cache only while it still belongs to the given generation. */
async function matchBuildCache(
  generation: number,
  cacheName: string,
  url: string,
) {
  return inspectWorkerState(async (state) => {
    if (
      state.generation !== generation ||
      state.blocked ||
      !state.builds.some((build) => build.cacheName === cacheName)
    )
      return undefined;
    return (await caches.open(cacheName)).match(url);
  });
}

async function snapshotIsComplete(build: CachedBuild) {
  const cache = await caches.open(build.cacheName);
  for (const resource of build.manifest.resources) {
    const response = await cache.match(absoluteUrl(resource.url));
    if (!response || !(await digestMatches(response, resource))) return false;
  }
  return true;
}

async function fetchBuildResource(
  resource: BuildResource,
  signal: AbortSignal,
) {
  const url = new URL(resource.url, scopeUrl);
  if (
    url.origin !== scopeUrl.origin ||
    !url.pathname.startsWith(scopeUrl.pathname)
  )
    throw new Error("Manifest resource is outside application scope");
  const response = await fetch(url, {
    // Bypass HTTP cache: we need bytes that match the integrity in the manifest.
    cache: "no-store",
    integrity: resource.integrity,
    signal,
  });
  if (response.status !== 200 || !(await digestMatches(response, resource)))
    throw new Error(`Invalid build resource: ${url.pathname}`);
  // SPA fallbacks sometimes return index.html for missing hashed assets.
  const contentType = response.headers.get("content-type") ?? "";
  if (/\.(?:js|css)$/.test(url.pathname) && contentType.includes("text/html"))
    throw new Error(`HTML returned for build resource: ${url.pathname}`);
  return response;
}

async function fetchManifest(signal: AbortSignal) {
  const response = await fetch(manifestUrl, { cache: "no-store", signal });
  if (response.status !== 200)
    throw new Error(`Manifest HTTP ${response.status}`);
  const manifest = (await response.json()) as BuildManifest;
  if (
    manifest.schemaVersion !== 1 ||
    !manifest.buildInfo?.buildId ||
    !Array.isArray(manifest.resources) ||
    !manifest.resources.some((item) => item.url === manifest.entrypoint)
  )
    throw new Error("Invalid build manifest");
  return manifest;
}

function hasSameFiles(left: BuildManifest, right: BuildManifest) {
  const files = ({ buildInfo, entrypoint, resources }: BuildManifest) =>
    JSON.stringify({ buildInfo, entrypoint, resources });
  return files(left) === files(right);
}

/** Find or create the build record for this manifest. */
async function registerBuild(manifest: BuildManifest, generation: number) {
  return withWorkerState(async (state) => {
    assertGeneration(state, generation);
    const existing = findBuild(state, manifest.buildInfo.buildId);
    // buildId is a hash of the files, so the same id must list the same files.
    // Only the commit and build time may differ (a rebuild of the same code).
    if (existing && !hasSameFiles(existing.manifest, manifest))
      throw new Error("Build ID was reused with different resources");
    state.manifestCheck!.buildId = manifest.buildInfo.buildId;
    if (existing) {
      existing.manifest = manifest;
      existing.error = null;
      return existing;
    }
    const build: CachedBuild = {
      manifest,
      cacheName: `app-build-${generation}-${manifest.buildInfo.buildId}`,
      state: "downloading",
      completed: 0,
      error: null,
    };
    state.builds.push(build);
    return build;
  });
}

/**
 * Returns null when the build cache already holds a valid copy. Otherwise copies
 * an identical file from another ready build, or downloads it.
 */
async function loadMissingResource(
  cache: Cache,
  resource: BuildResource,
  generation: number,
  signal: AbortSignal,
) {
  const url = absoluteUrl(resource.url);
  // Always re-check digests: Cache Storage can be evicted while IndexedDB
  // metadata still claims the build is present.
  const stored = await cache.match(url);
  if (stored && (await digestMatches(stored, resource))) return null;
  for (const other of (await readWorkerState()).builds) {
    if (
      other.state !== "ready" ||
      !other.manifest.resources.some(
        (item) =>
          item.url === resource.url && item.integrity === resource.integrity,
      )
    )
      continue;
    const shared = await matchBuildCache(generation, other.cacheName, url);
    if (shared && (await digestMatches(shared, resource))) return shared;
  }
  return fetchBuildResource(resource, signal);
}

async function downloadBuild(
  build: CachedBuild,
  generation: number,
  signal: AbortSignal,
) {
  const cache = await inspectWorkerState(async (state) => {
    assertGeneration(state, generation);
    return caches.open(build.cacheName);
  });
  const queue = [...build.manifest.resources];
  await Promise.all(
    Array.from({ length: downloadConcurrency }, async () => {
      for (let resource = queue.shift(); resource; resource = queue.shift()) {
        const response = await loadMissingResource(
          cache,
          resource,
          generation,
          signal,
        );
        if (!response) continue;
        await withWorkerState(async (state) => {
          assertGeneration(state, generation);
          const stored = state.builds.find(
            (item) => item.cacheName === build.cacheName,
          );
          if (!stored || stored.state === "deleting")
            throw new Error("Build cache was removed");
          await cache.put(absoluteUrl(resource.url), response);
          stored.completed = (await cache.keys()).length;
        });
      }
    }),
  );
}

async function promoteBuild(
  build: CachedBuild,
  generation: number,
  startedAt: string,
) {
  const { buildId } = build.manifest.buildInfo;
  await withWorkerState(async (state) => {
    assertGeneration(state, generation);
    const stored = state.builds.find(
      (item) => item.cacheName === build.cacheName,
    );
    if (!stored) throw new Error("Build cache was removed");
    stored.state = "ready";
    stored.completed = build.manifest.resources.length;
    stored.error = null;
    state.latestReadyBuildId = buildId;
    state.lastSuccessfulCheckAt = new Date().toISOString();
    state.manifestCheck = {
      startedAt,
      completedAt: state.lastSuccessfulCheckAt,
      succeeded: true,
      buildId,
      error: null,
    };
  });
}

async function recordFailure(
  error: unknown,
  build: CachedBuild | undefined,
  generation: number,
  startedAt: string,
) {
  await withWorkerState(async (state) => {
    if (state.generation !== generation || state.blocked) return;
    const message = errorMessage(error);
    state.manifestCheck = {
      startedAt,
      completedAt: new Date().toISOString(),
      succeeded: false,
      buildId: build?.manifest.buildInfo.buildId ?? null,
      error: message,
    };
    const stored = state.builds.find(
      (item) => item.cacheName === build?.cacheName,
    );
    if (!stored) return;
    stored.error = message;
    // A previously ready build that lost bytes must not stay the offline tip.
    if (stored.state !== "ready" || (await snapshotIsComplete(stored))) return;
    stored.state = "downloading";
    if (state.latestReadyBuildId === stored.manifest.buildInfo.buildId)
      state.latestReadyBuildId =
        state.builds.findLast((item) => item.state === "ready")?.manifest
          .buildInfo.buildId ?? null;
  });
}

async function prepareLatestBuild(): Promise<BuildInfo | null> {
  const { generation, blocked } = await readWorkerState();
  if (blocked) return null;
  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  activeDownload = controller;
  let build: CachedBuild | undefined;
  await withWorkerState(async (state) => {
    if (state.generation !== generation || state.blocked) return;
    state.manifestCheck = {
      startedAt,
      completedAt: null,
      succeeded: false,
      buildId: null,
      error: null,
    };
  });
  try {
    const manifest = await fetchManifest(controller.signal);
    build = await registerBuild(manifest, generation);
    await downloadBuild(build, generation, controller.signal);
    // Another deploy may have landed while we downloaded; refuse to promote a
    // snapshot that is no longer the server's current manifest.
    const latest = await fetchManifest(controller.signal);
    if (latest.buildInfo.buildId !== manifest.buildInfo.buildId)
      throw new Error("Deployment changed during build download");
    await promoteBuild(build, generation, startedAt);
    await broadcast({ type: "BUILD_READY", buildInfo: manifest.buildInfo });
    await collectUnusedBuilds();
    return manifest.buildInfo;
  } catch (error) {
    controller.abort();
    await recordFailure(error, build, generation, startedAt);
    return null;
  } finally {
    if (activeDownload === controller) activeDownload = null;
  }
}

/** Resolves to the build info only after that build was promoted to `ready`. */
export async function checkManifest(): Promise<BuildInfo | null> {
  checkPromise ??= prepareLatestBuild().finally(() => {
    checkPromise = null;
  });
  return checkPromise;
}

async function collectUnusedBuilds() {
  await withWorkerState(async (state) => {
    if (state.blocked) return;
    const clients = (
      await self.clients.matchAll({ type: "window", includeUncontrolled: true })
    ).filter((client) => client.url.startsWith(scopeUrl.href));
    // A brand-new window client may exist before CLIENT_HELLO; bail so we do
    // not delete the build it is about to pin.
    if (
      clients.some(
        (client) => !state.clients.some((pin) => pin.clientId === client.id),
      )
    )
      return;
    const liveIds = new Set(clients.map((client) => client.id));
    // Navigation pins may precede their client in the list; keep them briefly.
    state.clients = state.clients.filter(
      (pin) =>
        liveIds.has(pin.clientId) ||
        (pin.reservedAt !== undefined &&
          Date.now() - pin.reservedAt < navigationPinLifetime),
    );
    const used = new Set(state.clients.map((pin) => pin.buildId));
    for (const build of [...state.builds]) {
      const { buildId } = build.manifest.buildInfo;
      if (
        build.state === "downloading" ||
        buildId === state.latestReadyBuildId ||
        used.has(buildId)
      )
        continue;
      build.state = "deleting";
      await caches.delete(build.cacheName);
      state.builds = state.builds.filter((item) => item !== build);
    }
  });
}

/** Serve the latest complete snapshot, demoting ready builds that lost bytes. */
async function serveCachedNavigation(state: WorkerState, event: FetchEvent) {
  if (state.blocked) return undefined;
  const latest = findBuild(state, state.latestReadyBuildId);
  const candidates = [
    latest,
    ...state.builds.filter((build) => build !== latest),
  ].filter((build) => build?.state === "ready");
  for (const build of candidates) {
    if (!build) continue;
    if (!(await snapshotIsComplete(build))) {
      build.state = "downloading";
      build.error = "Cached snapshot is incomplete or corrupted";
      continue;
    }
    const response = await (
      await caches.open(build.cacheName)
    ).match(absoluteUrl(build.manifest.entrypoint));
    if (!response) return undefined;
    state.latestReadyBuildId = build.manifest.buildInfo.buildId;
    pinNavigation(state, event, build.manifest.buildInfo.buildId, "cache");
    return response;
  }
  return undefined;
}

async function handleNavigation(event: FetchEvent) {
  try {
    // Always revalidate the HTML: a stale copy from the HTTP cache (e.g. when
    // the server sends no Cache-Control) would keep the tab on an old build.
    const response = await fetch(
      new Request(event.request, { cache: "no-cache" }),
    );
    // Treat gateway/app failures like offline so a known-good snapshot can win.
    if (response.status >= 500) throw new Error("Navigation server error");
    if (
      event.resultingClientId &&
      response.ok &&
      response.headers.get("content-type")?.includes("text/html")
    ) {
      // Pin the new document to the HTML it actually received, which may be
      // a different build from latestReadyBuildId while it is still warming.
      const html = await response.clone().text();
      const buildId = html.match(/data-build-id=["']([^"']+)["']/)?.[1];
      if (buildId)
        await withWorkerState(async (state) =>
          pinNavigation(state, event, buildId, "network"),
        );
    }
    return response;
  } catch (error) {
    const cached = await withWorkerState((state) =>
      serveCachedNavigation(state, event),
    );
    if (!cached) throw error;
    return cached;
  }
}

async function handleAsset(event: FetchEvent) {
  const state = await readWorkerState();
  if (state.blocked) return fetch(event.request);
  const url = new URL(event.request.url);
  const pin = state.clients.find((item) => item.clientId === event.clientId);
  const build = findBuild(state, pin?.buildId);
  const resource = build?.manifest.resources.find(
    (item) => absoluteUrl(item.url) === url.href,
  );
  if (build && resource) {
    // Cache miss on a pinned build: fetch with integrity rather than serving a
    // different build's file that happens to share the same URL path.
    return (
      (await matchBuildCache(state.generation, build.cacheName, url.href)) ??
      fetchBuildResource(resource, event.request.signal)
    );
  }
  // Vite hashed /assets/* filenames are content-addressed, so reuse across
  // builds is safe. Unhashed public URLs (favicon, etc.) are not.
  if (url.pathname.includes("/assets/")) {
    for (const other of state.builds) {
      const cached = await matchBuildCache(
        state.generation,
        other.cacheName,
        url.href,
      );
      if (cached) return cached;
    }
  }
  return fetch(event.request);
}

export function handleSiteUpdateFetch(event: FetchEvent) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== scopeUrl.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    // Warm/refresh the snapshot whenever someone opens a page.
    event.waitUntil(checkManifest());
    return;
  }
  // Let the browser fetch the live manifest and worker script themselves.
  if (
    url.pathname.startsWith(scopeUrl.pathname) &&
    url.href !== manifestUrl &&
    !url.pathname.endsWith("/sw.js")
  )
    event.respondWith(handleAsset(event));
}

export async function handleClientHello(
  command: ClientHelloCommand,
  source: Client,
): Promise<ClientHelloReply> {
  const { state, navigationSource } = await withWorkerState(async (current) => {
    const { navigationSource } =
      current.clients.find((pin) => pin.clientId === source.id) ?? {};
    pinClient(current, {
      clientId: source.id,
      // The page reports the build it actually booted with (from BUILD_INFO),
      // which pins asset serving for that tab.
      buildId: command.buildId,
      navigationSource,
      pathname: command.pathname,
      interval: command.interval,
      nextCheckAt: command.nextCheckAt,
      lastHello: {
        message: command,
        receivedAt: new Date().toISOString(),
        receivedBy: {
          scriptURL: self.location.href,
          serviceWorkerHash: BUILD_INFO.serviceWorkerHash,
        },
      },
    });
    return { state: current, navigationSource };
  });
  // Re-announce so a tab that opened after the download still learns about
  // the latest complete build.
  const ready = findBuild(state, state.latestReadyBuildId);
  if (ready?.state === "ready" && !state.blocked)
    source.postMessage({
      type: "BUILD_READY",
      buildInfo: ready.manifest.buildInfo,
    } satisfies BuildReadyNotification);
  await collectUnusedBuilds();
  return {
    generation: state.generation,
    navigationSource: navigationSource ?? null,
  };
}
