/**
 * Service worker entrypoint.
 *
 * Feature modules own their fetch/message logic. This file only:
 * - owns lifecycle (install / activate / reset),
 * - routes RPC and fetch to the active features,
 * - exposes debug status.
 *
 * Site updates are independent of the worker script bytes: app deploys change
 * build-manifest.json while sw.js stays identical until worker logic changes.
 */
import {
  handleSiteUpdateFetch,
  handleSiteUpdateMessage,
} from "./features/site-update.ts";
import type {
  WorkerBuildInfo,
  WorkerCommand,
  WorkerStatus,
} from "./protocol.ts";
import { abortBackground, broadcast, errorMessage } from "./shared.ts";
import {
  purgeWorkerCaches,
  readWorkerState,
  recoverPendingPurge,
  withWorkerState,
} from "./storage.ts";

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_INFO: WorkerBuildInfo;

console.info("[Service Worker] Build info:", BUILD_INFO);

async function getStatus(): Promise<WorkerStatus> {
  return withWorkerState(async (state) => {
    const summaries = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      let bytes = 0;
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) bytes += (await response.arrayBuffer()).byteLength;
      }
      summaries.push({ name, entries: keys.length, bytes });
    }
    return {
      ...state,
      buildInfo: BUILD_INFO,
      scope: self.registration.scope,
      caches: summaries,
    };
  });
}

async function handleMessage(event: ExtendableMessageEvent) {
  const command = event.data as WorkerCommand;
  switch (command.type) {
    case "GET_BUILD_INFO":
      return BUILD_INFO;
    case "GET_STATUS":
      return getStatus();
    case "GET_STATE":
      return readWorkerState();
    case "RESET": {
      // Abort in-flight downloads before wiping caches so a late put cannot
      // recreate storage after the reset gate is raised.
      abortBackground();
      const state = await purgeWorkerCaches(true);
      await broadcast({
        type: "CACHE_INVALIDATED",
        generation: state.generation,
        reset: true,
      });
      return state;
    }
    default: {
      const result = await handleSiteUpdateMessage(command, event);
      if (result !== undefined) return result;
      throw new Error(`Unknown service worker command: ${command.type}`);
    }
  }
}

self.addEventListener("install", (event) =>
  // Take control on the next navigation without waiting for old tabs to close.
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // A previous worker may have crashed mid-purge; finish that before claiming.
      await recoverPendingPurge();
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  event.waitUntil(
    recoverPendingPurge()
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
  // Keep the reset gate honest even when pages only talk via network traffic.
  event.waitUntil(recoverPendingPurge());
  if (handleSiteUpdateFetch(event)) return;
});
