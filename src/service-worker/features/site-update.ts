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
 *   are collected after a newer build is ready.
 */
import type {
  BuildInfo,
  BuildManifest,
  BuildResource,
  CachedBuild,
  ClientHelloReply,
  WorkerBuildInfo,
  WorkerCommand,
} from "../protocol.ts";
import {
  broadcast,
  errorMessage,
  manifestUrl,
  scopeUrl,
  trackBackground,
  untrackBackground,
} from "../shared.ts";
import { readWorkerState, withWorkerState } from "../storage.ts";

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_INFO: WorkerBuildInfo;

/** Deduplicate concurrent CHECK_MANIFEST / navigate-triggered downloads. */
let checkPromise: Promise<BuildInfo | null> | null = null;

async function digestMatches(response: Response, resource: BuildResource) {
  const bytes = await response.clone().arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-384", bytes);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return (
    resource.integrity === `sha384-${base64}` &&
    bytes.byteLength === resource.size
  );
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

export async function checkManifest(): Promise<BuildInfo | null> {
  if (checkPromise) return checkPromise;
  checkPromise = prepareLatestBuild().finally(() => {
    checkPromise = null;
  });
  return checkPromise;
}

async function prepareLatestBuild(): Promise<BuildInfo | null> {
  const initial = await readWorkerState();
  if (initial.blocked) return null;
  const generation = initial.generation;
  const startedAt = new Date().toISOString();
  const controller = trackBackground(new AbortController());
  let candidate: CachedBuild | undefined;
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
    const response = await fetch(manifestUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
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
    candidate = await withWorkerState(async (state) => {
      if (state.generation !== generation || state.blocked)
        throw new Error("Cache generation changed");
      const existing = state.builds.find(
        (build) =>
          build.manifest.buildInfo.buildId === manifest.buildInfo.buildId,
      );
      // buildId is a deploy UUID; colliding ids with different contents means a
      // broken pipeline, not something we can safely merge.
      if (
        existing &&
        JSON.stringify(existing.manifest) !== JSON.stringify(manifest)
      )
        throw new Error("Build ID was reused with different resources");
      state.manifestCheck!.buildId = manifest.buildInfo.buildId;
      if (existing) {
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
    const build = candidate;
    const cache = await withWorkerState(async (state) => {
      if (state.generation !== generation || state.blocked)
        throw new Error("Cache generation changed");
      return caches.open(build.cacheName);
    });
    {
      // Always re-check digests: Cache Storage can be evicted while IndexedDB
      // metadata still claims the build is present.
      let resourceIndex = 0;
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (resourceIndex < manifest.resources.length) {
            const resource = manifest.resources[resourceIndex++];
            const absoluteUrl = new URL(resource.url, scopeUrl).href;
            let resourceResponse = await cache.match(absoluteUrl);
            if (
              !resourceResponse ||
              !(await digestMatches(resourceResponse, resource))
            ) {
              resourceResponse = undefined;
              // Copy unchanged hashed files from an older ready build instead of
              // re-downloading them when only a few assets changed.
              const state = await readWorkerState();
              for (const other of state.builds) {
                if (
                  other.state !== "ready" ||
                  !other.manifest.resources.some(
                    (item) =>
                      item.url === resource.url &&
                      item.integrity === resource.integrity,
                  )
                )
                  continue;
                const shared = await withWorkerState(async (current) => {
                  if (
                    current.generation !== generation ||
                    current.blocked ||
                    !current.builds.some(
                      (item) => item.cacheName === other.cacheName,
                    )
                  )
                    throw new Error("Cache generation changed");
                  return (await caches.open(other.cacheName)).match(
                    absoluteUrl,
                  );
                });
                if (shared && (await digestMatches(shared, resource))) {
                  resourceResponse = shared;
                  break;
                }
              }
              resourceResponse ??= await fetchBuildResource(
                resource,
                controller.signal,
              );
            }
            await withWorkerState(async (state) => {
              if (state.generation !== generation || state.blocked)
                throw new Error("Cache generation changed");
              const stored = state.builds.find(
                (item) => item.cacheName === build.cacheName,
              );
              if (!stored || stored.state === "deleting")
                throw new Error("Build cache was removed");
              await cache.put(absoluteUrl, resourceResponse);
              stored.completed = (await cache.keys()).length;
            });
          }
        }),
      );
    }
    // Another deploy may have landed while we downloaded; refuse to promote a
    // snapshot that is no longer the server's current manifest.
    const latestResponse = await fetch(manifestUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (
      !latestResponse.ok ||
      ((await latestResponse.json()) as BuildManifest).buildInfo.buildId !==
        manifest.buildInfo.buildId
    )
      throw new Error("Deployment changed during build download");
    await withWorkerState(async (state) => {
      if (state.generation !== generation || state.blocked)
        throw new Error("Cache generation changed");
      const stored = state.builds.find(
        (item) => item.cacheName === build.cacheName,
      )!;
      stored.state = "ready";
      stored.completed = manifest.resources.length;
      stored.error = null;
      state.latestReadyBuildId = manifest.buildInfo.buildId;
      state.lastSuccessfulCheckAt = new Date().toISOString();
      state.manifestCheck = {
        startedAt,
        completedAt: state.lastSuccessfulCheckAt,
        succeeded: true,
        buildId: manifest.buildInfo.buildId,
        error: null,
      };
    });
    await broadcast({
      type: "BUILD_READY",
      buildInfo: manifest.buildInfo,
      generation,
    });
    await collectUnusedBuilds();
    return manifest.buildInfo;
  } catch (error) {
    controller.abort();
    await withWorkerState(async (state) => {
      if (state.generation !== generation || state.blocked) return;
      const message = errorMessage(error);
      state.manifestCheck = {
        startedAt,
        completedAt: new Date().toISOString(),
        succeeded: false,
        buildId: candidate?.manifest.buildInfo.buildId ?? null,
        error: message,
      };
      const build = state.builds.find(
        (item) => item.cacheName === candidate?.cacheName,
      );
      if (build) build.error = message;
      // A previously ready build that lost bytes must not stay the offline tip.
      if (build?.state === "ready" && !(await snapshotIsComplete(build))) {
        build.state = "downloading";
        if (state.latestReadyBuildId === build.manifest.buildInfo.buildId)
          state.latestReadyBuildId =
            [...state.builds].reverse().find((item) => item.state === "ready")
              ?.manifest.buildInfo.buildId ?? null;
      }
    });
    return null;
  } finally {
    untrackBackground(controller);
  }
}

async function collectUnusedBuilds() {
  await withWorkerState(async (state) => {
    if (state.blocked) return;
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const scoped = clients.filter((client) =>
      client.url.startsWith(scopeUrl.href),
    );
    const ids = new Set(scoped.map((client) => client.id));
    // A brand-new window client may exist before CLIENT_HELLO; bail so we do
    // not delete the build it is about to pin.
    if (
      scoped.some(
        (client) => !state.clients.some((pin) => pin.clientId === client.id),
      )
    )
      return;
    // Navigate creates a temporary pin keyed by resultingClientId before the
    // document runs. Keep those reservations briefly even if the client list
    // has not caught up yet.
    const reservedIds = new Set(
      state.clients
        .filter(
          (pin) =>
            pin.pathname === "__navigation__" &&
            Date.now() - (pin.reservedAt ?? Date.now()) < 60_000,
        )
        .map((pin) => pin.clientId),
    );
    state.clients = state.clients.filter(
      (pin) => ids.has(pin.clientId) || reservedIds.has(pin.clientId),
    );
    const used = new Set(state.clients.map((pin) => pin.buildId));
    for (const build of [...state.builds]) {
      if (
        build.state === "downloading" ||
        build.manifest.buildInfo.buildId === state.latestReadyBuildId ||
        used.has(build.manifest.buildInfo.buildId)
      )
        continue;
      build.state = "deleting";
      await caches.delete(build.cacheName);
      state.builds = state.builds.filter(
        (item) => item.cacheName !== build.cacheName,
      );
    }
  });
}

async function snapshotIsComplete(build: CachedBuild) {
  const cache = await caches.open(build.cacheName);
  for (const resource of build.manifest.resources) {
    const response = await cache.match(new URL(resource.url, scopeUrl).href);
    if (!response || !(await digestMatches(response, resource))) return false;
  }
  return true;
}

async function pinNavigation(event: FetchEvent, buildId: string) {
  if (!event.resultingClientId) return;
  await withWorkerState(async (state) => {
    state.clients = state.clients.filter(
      (pin) => pin.clientId !== event.resultingClientId,
    );
    state.clients.push({
      clientId: event.resultingClientId,
      buildId,
      navigationSource: "network",
      pathname: "__navigation__",
      reservedAt: Date.now(),
      interval: 0,
      nextCheckAt: null,
    });
  });
}

async function handleNavigation(event: FetchEvent) {
  try {
    const response = await fetch(event.request);
    // Treat gateway/app failures like offline so a known-good snapshot can win.
    if (response.status >= 500) throw new Error("Navigation server error");
    if (
      response.ok &&
      response.headers.get("content-type")?.includes("text/html")
    ) {
      const html = await response.clone().text();
      // Pin the new document to the HTML it actually received, which may be a
      // newer build than latestReadyBuildId while that build is still warming.
      const buildId = html.match(/data-build-id=["']([^"']+)["']/)?.[1];
      if (buildId) await pinNavigation(event, buildId);
    }
    return response;
  } catch (error) {
    return withWorkerState(async (state) => {
      if (state.blocked) throw error;
      const candidates = state.builds.filter((item) => item.state === "ready");
      candidates.sort(
        (left, right) =>
          Number(
            right.manifest.buildInfo.buildId === state.latestReadyBuildId,
          ) -
          Number(left.manifest.buildInfo.buildId === state.latestReadyBuildId),
      );
      let build: CachedBuild | undefined;
      for (const candidate of candidates) {
        if (await snapshotIsComplete(candidate)) {
          build = candidate;
          break;
        }
        // Metadata said ready but bytes are gone — demote and keep searching.
        candidate.state = "downloading";
        candidate.error = "Cached snapshot is incomplete or corrupted";
      }
      if (!build) throw error;
      state.latestReadyBuildId = build.manifest.buildInfo.buildId;
      const response = await (
        await caches.open(build.cacheName)
      ).match(new URL(build.manifest.entrypoint, scopeUrl).href);
      if (!response) throw error;
      if (event.resultingClientId) {
        state.clients = state.clients.filter(
          (pin) => pin.clientId !== event.resultingClientId,
        );
        state.clients.push({
          clientId: event.resultingClientId,
          buildId: build.manifest.buildInfo.buildId,
          navigationSource: "cache",
          pathname: "__navigation__",
          reservedAt: Date.now(),
          interval: 0,
          nextCheckAt: null,
        });
      }
      return response;
    });
  }
}

async function handleAsset(event: FetchEvent) {
  const state = await readWorkerState();
  if (state.blocked) return fetch(event.request);
  const pin = state.clients.find((item) => item.clientId === event.clientId);
  const build = state.builds.find(
    (item) => item.manifest.buildInfo.buildId === pin?.buildId,
  );
  const url = new URL(event.request.url);
  const resource = build?.manifest.resources.find(
    (item) => new URL(item.url, scopeUrl).href === url.href,
  );
  if (build && resource) {
    const cached = await withWorkerState(async (current) => {
      if (
        current.generation !== state.generation ||
        current.blocked ||
        !current.builds.some((item) => item.cacheName === build.cacheName)
      )
        return undefined;
      return (await caches.open(build.cacheName)).match(url.href);
    });
    if (cached) return cached;
    // Cache miss on a pinned build: fetch with integrity rather than serving a
    // different build's file that happens to share the same URL path.
    return fetchBuildResource(resource, event.request.signal);
  }
  // Vite hashed /assets/* filenames are content-addressed, so reuse across
  // builds is safe. Unhashed public URLs (favicon, etc.) are not.
  if (url.pathname.includes("/assets/")) {
    for (const other of state.builds) {
      const cached = await withWorkerState(async (current) => {
        if (
          current.generation !== state.generation ||
          current.blocked ||
          !current.builds.some((item) => item.cacheName === other.cacheName)
        )
          return undefined;
        return (await caches.open(other.cacheName)).match(url.href);
      });
      if (cached) return cached;
    }
  }
  return fetch(event.request);
}

/** @returns true when this feature claimed the request. */
export function handleSiteUpdateFetch(event: FetchEvent): boolean {
  if (event.request.method !== "GET") return false;
  const url = new URL(event.request.url);
  if (url.origin === scopeUrl.origin && event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    // Warm/refresh the snapshot whenever someone opens a page.
    event.waitUntil(checkManifest());
    return true;
  }
  if (
    url.origin === scopeUrl.origin &&
    url.pathname.startsWith(scopeUrl.pathname) &&
    // Let the browser fetch the live manifest and worker script themselves.
    url.href !== manifestUrl &&
    !url.pathname.endsWith("/sw.js")
  ) {
    event.respondWith(handleAsset(event));
    return true;
  }
  return false;
}

export async function handleSiteUpdateMessage(
  command: WorkerCommand,
  event: ExtendableMessageEvent,
) {
  const source = event.source as Client | null;
  switch (command.type) {
    case "CHECK_MANIFEST":
      return checkManifest();
    case "CLIENT_HELLO": {
      if (!source?.id) throw new Error("Missing client");
      const state = await withWorkerState(async (current) => {
        const navigationSource = current.clients.find(
          (pin) => pin.clientId === source.id,
        )?.navigationSource;
        current.clients = current.clients.filter(
          (pin) => pin.clientId !== source.id,
        );
        current.clients.push({
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
        return current;
      });
      const ready = state.builds.find(
        (build) =>
          build.state === "ready" &&
          build.manifest.buildInfo.buildId === state.latestReadyBuildId,
      );
      // Re-announce so a tab that opened after the download still learns about
      // a newer complete build (TV uses this to auto-reload).
      if (ready && !state.blocked)
        source.postMessage({
          type: "BUILD_READY",
          buildInfo: ready.manifest.buildInfo,
          generation: state.generation,
        });
      await collectUnusedBuilds();
      return {
        generation: state.generation,
        navigationSource:
          state.clients.find((pin) => pin.clientId === source.id)
            ?.navigationSource ?? null,
      } satisfies ClientHelloReply;
    }
    default:
      return undefined;
  }
}
