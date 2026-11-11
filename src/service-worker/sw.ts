/**
 * Service worker entrypoint.
 *
 * site-update.ts owns the app's offline snapshots (same-origin requests);
 * api-cache.ts keeps selected API responses. This file only:
 * - owns lifecycle (startup cleanup / install / activate / reset),
 * - routes fetch and RPC commands,
 * - exposes diagnostics.
 *
 * Site updates are independent of the worker script bytes: app deploys change
 * build-manifest.json while sw.js stays identical until worker logic changes.
 */
import { handleApiCacheFetch } from "./api-cache.ts";
import { mirrorUrl, networkFetch } from "./proxy-fallback.ts";
import {
  mapsCacheName,
  userDataCacheName,
  type CacheSummary,
  type WorkerBuildInfo,
  type WorkerCommand,
  type WorkerDiagnosticsSnapshot,
} from "./protocol.ts";
import {
  abortDownloads,
  checkManifest,
  errorMessage,
  handleClientHello,
  handleSiteUpdateFetch,
} from "./site-update.ts";
import {
  deleteUnknownCaches,
  purgeWorkerCaches,
  readWorkerState,
  recoverPendingPurge,
} from "./storage.ts";

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_INFO: WorkerBuildInfo;

console.info("[Service Worker] Build Info:", BUILD_INFO);

/**
 * Runs on every worker start. Finishes a purge that crashed midway (purge
 * raises the `blocked` gate before deleting, so fetches need not wait), then
 * removes caches this worker does not own, such as the former Workbox ones.
 */
const startupCleanup = (async () => {
  await recoverPendingPurge();
  await deleteUnknownCaches([userDataCacheName, mapsCacheName]);
  indexedDB.deleteDatabase("workbox-expiration");
})().catch((error) =>
  console.error("[Service Worker] Startup cleanup failed:", error),
);

async function summarizeCaches(): Promise<CacheSummary[]> {
  const summaries = [];
  for (const name of await caches.keys()) {
    // A cache deleted meanwhile (logout, reset) would be recreated by open().
    if (!(await caches.has(name))) continue;
    const cache = await caches.open(name);
    const keys = await cache.keys();
    let bytes = 0;
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) bytes += (await response.arrayBuffer()).byteLength;
    }
    summaries.push({ name, entries: keys.length, bytes });
  }
  return summaries;
}

async function getDiagnostics(
  requestingClientId: string | null,
): Promise<WorkerDiagnosticsSnapshot> {
  const scope = self.registration.scope;
  const [storage, cacheStorage, controlledClients, allClients] =
    await Promise.all([
      readWorkerState(),
      summarizeCaches(),
      self.clients.matchAll({ type: "window" }),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }),
    ]);
  const controlledIds = new Set(controlledClients.map((client) => client.id));
  return {
    worker: { buildInfo: BUILD_INFO, scriptURL: self.location.href, scope },
    storage,
    runtimeClients: {
      requestingClientId,
      windows: allClients
        .filter((client) => client.url.startsWith(scope))
        .map((client) => ({
          id: client.id,
          url: client.url,
          focused: client.focused,
          visibilityState: client.visibilityState,
          controlled: controlledIds.has(client.id),
        })),
    },
    cacheStorage,
  };
}

async function handleMessage(event: ExtendableMessageEvent) {
  const command = event.data as WorkerCommand;
  const source = event.source instanceof Client ? event.source : null;
  switch (command.type) {
    case "CLIENT_HELLO":
      if (!source) throw new Error("Missing client");
      return handleClientHello(command, source);
    case "CHECK_MANIFEST":
      return checkManifest();
    case "GET_STATE":
      return readWorkerState();
    case "GET_DIAGNOSTICS":
      return getDiagnostics(source?.id ?? null);
    case "RESET":
      abortDownloads();
      return purgeWorkerCaches();
    default:
      throw new Error(
        `Unknown service worker command: ${(command as { type: string }).type}`,
      );
  }
}

self.addEventListener("install", (event) =>
  // Take control on the next navigation without waiting for old tabs to close.
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) => {
  event.waitUntil(startupCleanup.then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => {
  event.waitUntil(
    startupCleanup
      .then(() => handleMessage(event))
      .then(
        (result) => event.ports[0]?.postMessage({ ok: true, result }),
        (error) =>
          event.ports[0]?.postMessage({
            ok: false,
            error: errorMessage(error),
          }),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) return handleSiteUpdateFetch(event);
  // A cached API GET answers on its own; any other request to a host with a
  // mirror still needs the retry that the mirror gives.
  if (handleApiCacheFetch(event)) return;
  if (mirrorUrl(url)) event.respondWith(networkFetch(event.request));
});
