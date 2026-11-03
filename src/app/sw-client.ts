import type { WorkerCommand } from "@/service-worker/protocol.ts";
import { queryClient } from "./query-client.ts";
import {
  purgeWorkerCaches,
  withWorkerState,
} from "@/service-worker/storage.ts";

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

/** Debug-page hard reset: wipe caches, unregister, reload into a clean generation. */
export async function resetServiceWorker() {
  window.dispatchEvent(new Event("sw-reset-started"));
  if (navigator.serviceWorker?.controller)
    await requestWorker({ type: "RESET" });
  else {
    // No controller (broken/mid-reset state): purge from the page context and
    // notify other tabs via BroadcastChannel the same way the worker would.
    const state = await purgeWorkerCaches(true);
    const channel = new BroadcastChannel("innohassle-sw-control");
    channel.postMessage({
      type: "CACHE_INVALIDATED",
      generation: state.generation,
      reset: true,
    });
    channel.close();
  }
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
