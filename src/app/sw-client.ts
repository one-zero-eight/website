import type { BuildInfo, WorkerCommand } from "@/service-worker/protocol.ts";
import {
  purgeWorkerCaches,
  withWorkerState,
} from "@/service-worker/storage.ts";
import { queryClient } from "./query-client.ts";
import { setSiteUnavailable } from "./site-availability.ts";

/** Dispatched on window after every completed manifest check. */
export const manifestCheckedEvent = "sw-manifest-checked";
/** Dispatched on window before a debug reset, so automatic work stops first. */
export const resetStartedEvent = "sw-reset-started";

export async function requestWorker<T>(
  command: WorkerCommand,
  worker?: ServiceWorker,
): Promise<T> {
  const target = worker ?? navigator.serviceWorker?.controller;
  if (!target) throw new Error("No controlling service worker");
  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(
      () => {
        channel.port1.close();
        reject(new Error("Service worker request timed out"));
      },
      // Full snapshot download can take a while on slow links / large builds.
      command.type === "CHECK_MANIFEST" ? 120_000 : 15_000,
    );
    channel.port1.onmessage = (
      event: MessageEvent<{ ok: boolean; result: T; error?: string }>,
    ) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (!event.data.ok) {
        reject(new Error(event.data.error ?? "Service worker request failed"));
        return;
      }
      resolve(event.data.result);
    };
    target.postMessage(command, [channel.port2]);
  });
}

/**
 * Ask the worker to fetch the server's manifest and download that build.
 * Resolves to its build info once it is completely ready, otherwise null.
 */
export async function checkManifest() {
  const readyBuild = await requestWorker<BuildInfo | null>({
    type: "CHECK_MANIFEST",
  });
  // The manifest came from the server, so it is reachable again.
  if (readyBuild) setSiteUnavailable(false);
  window.dispatchEvent(new Event(manifestCheckedEvent));
  return readyBuild;
}

/** Debug-page hard reset: wipe caches, unregister, reload into a clean generation. */
export async function resetServiceWorker() {
  window.dispatchEvent(new Event(resetStartedEvent));
  // Without a controller (broken/mid-reset state), purge from the page context.
  if (navigator.serviceWorker?.controller)
    await requestWorker({ type: "RESET" });
  else await purgeWorkerCaches();
  const registrations =
    (await navigator.serviceWorker?.getRegistrations()) ?? [];
  for (const registration of registrations) await registration.unregister();
  // Keep a durable gate for replaced workers; only a newly registered page unlocks it.
  await withWorkerState(async (state) => {
    state.blocked = true;
  });
  await queryClient.cancelQueries();
  queryClient.clear();
  window.location.reload();
}
