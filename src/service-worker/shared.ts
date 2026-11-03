import type { WorkerNotification } from "./protocol.ts";

declare const self: ServiceWorkerGlobalScope;

export const scopeUrl = new URL(self.registration.scope);
export const manifestUrl = new URL("build-manifest.json", scopeUrl).href;

// Controllers registered here are aborted on RESET so feature downloads cannot
// race with cache deletion across the whole worker.
const backgroundControllers = new Set<AbortController>();

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Service worker operation failed";
}

export async function broadcast(message: WorkerNotification) {
  // includeUncontrolled: tabs that just navigated may not have a controller yet
  // but still need BUILD_READY / CACHE_INVALIDATED.
  for (const client of await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })) {
    client.postMessage(message);
  }
}

export function trackBackground(controller: AbortController) {
  backgroundControllers.add(controller);
  return controller;
}

export function untrackBackground(controller: AbortController) {
  backgroundControllers.delete(controller);
}

export function abortBackground() {
  for (const controller of backgroundControllers) controller.abort();
  backgroundControllers.clear();
}
