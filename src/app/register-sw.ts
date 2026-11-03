import { requestWorker } from "./sw-client.ts";
import { queryClient } from "./query-client.ts";
import {
  isTvPath,
  manifestPollInterval,
  type WorkerNotification,
  type WorkerState,
} from "@/service-worker/protocol.ts";
import { withWorkerState } from "@/service-worker/storage.ts";

export const appUpdateAvailableEvent = "app-update-available";
let pendingUpdate: (() => void) | undefined;
export function getPendingAppUpdate() {
  return pendingUpdate;
}

/**
 * Page-side controller for the site-update feature.
 *
 * Normal tabs: poll the manifest in the background; the user keeps the build
 * they already loaded until they reload/navigate.
 * TV tabs: when a newer build is fully ready, reload once automatically
 * (AppUpdatePrompt covers the rare case where beforeunload blocks that reload).
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let checking = false;
  let checkRequested = false;
  let pathname = window.location.pathname;
  let nextCheckAt: string | null = null;
  const reloadAttempts = new Set<string>();

  function handleAppReload() {
    window.location.reload();
  }

  async function sendHello() {
    if (!navigator.serviceWorker.controller || stopped) return;
    await requestWorker({
      type: "CLIENT_HELLO",
      buildId: BUILD_INFO.buildId,
      pathname,
      interval: manifestPollInterval(pathname),
      nextCheckAt,
    });
  }

  function scheduleCheck() {
    clearTimeout(timer);
    if (stopped) return;
    const delay = manifestPollInterval(pathname);
    nextCheckAt = new Date(Date.now() + delay).toISOString();
    timer = setTimeout(() => void checkForUpdate(), delay);
  }

  async function checkForUpdate() {
    // Offline checks would only fail and burn battery; navigation already
    // triggers a manifest check when connectivity returns.
    if (stopped || !navigator.serviceWorker.controller || !navigator.onLine)
      return;
    if (checking) {
      checkRequested = true;
      return;
    }
    checking = true;
    clearTimeout(timer);
    nextCheckAt = null;
    try {
      await sendHello();
      await requestWorker({ type: "CHECK_MANIFEST" });
      window.dispatchEvent(new Event("sw-check-completed"));
    } catch (error) {
      console.warn("[Service Worker] Update check failed:", error);
    } finally {
      checking = false;
      scheduleCheck();
      void sendHello().catch(() => undefined);
      if (checkRequested) {
        checkRequested = false;
        void checkForUpdate();
      }
    }
  }

  function handleRouteChange() {
    const nextPathname = window.location.pathname;
    if (pathname === nextPathname) return;
    pathname = nextPathname;
    // Leaving a route dismisses a pending update prompt; the next BUILD_READY
    // or manual reload can offer it again if still relevant.
    pendingUpdate = undefined;
    window.dispatchEvent(new Event(appUpdateAvailableEvent));
    scheduleCheck();
    void sendHello().catch(() => undefined);
  }

  function handleCacheInvalidated(message: WorkerNotification) {
    if (message.type !== "CACHE_INVALIDATED" || !message.reset) return;
    stopped = true;
    clearTimeout(timer);
    void queryClient.cancelQueries().then(() => queryClient.clear());
  }

  // Pages without an active controller (mid-reset) still hear the reset broadcast.
  const controlChannel = new BroadcastChannel("innohassle-sw-control");
  controlChannel.onmessage = (event: MessageEvent<WorkerNotification>) => {
    handleCacheInvalidated(event.data);
  };

  navigator.serviceWorker.addEventListener(
    "message",
    (event: MessageEvent<WorkerNotification>) => {
      const message = event.data;
      if (message.type === "CACHE_INVALIDATED") {
        handleCacheInvalidated(message);
        return;
      }
      if (
        message.type !== "BUILD_READY" ||
        stopped ||
        message.buildInfo.buildId === BUILD_INFO.buildId
      )
        return;
      // Non-TV: keep the open session on its current build; only TV should
      // interrupt itself when a complete newer snapshot is available.
      if (
        !isTvPath(window.location.pathname) ||
        reloadAttempts.has(message.buildInfo.buildId)
      )
        return;
      reloadAttempts.add(message.buildInfo.buildId);
      void (async () => {
        const state = await requestWorker<WorkerState>({ type: "GET_STATE" });
        if (
          stopped ||
          !isTvPath(window.location.pathname) ||
          state.blocked ||
          state.generation !== message.generation ||
          state.latestReadyBuildId !== message.buildInfo.buildId
        )
          return;
        pendingUpdate = handleAppReload;
        window.dispatchEvent(new Event(appUpdateAvailableEvent));
        handleAppReload();
      })().catch(() => undefined);
    },
  );
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    scheduleCheck();
    void checkForUpdate();
  });
  window.addEventListener("sw-reset-started", () => {
    stopped = true;
    clearTimeout(timer);
  });
  window.addEventListener("online", () => void checkForUpdate());
  window.addEventListener("pageshow", () => {
    handleRouteChange();
    void sendHello().catch(() => undefined);
  });
  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("sw-route-changed", handleRouteChange);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    handleRouteChange();
    if (!nextCheckAt || Date.now() >= Date.parse(nextCheckAt))
      void checkForUpdate();
    else void sendHello().catch(() => undefined);
  });

  void (async () => {
    // Debug reset leaves blocked=true so a replaced worker cannot refill caches.
    // A normal page load after unregister+reload clears that gate here.
    await withWorkerState(async (state) => {
      if (state.blocked && !state.resetPending) state.blocked = false;
    });
    await navigator.serviceWorker.register("/sw.js", {
      // Always revalidate sw.js from the network; HTTP caching would hide rare
      // worker-logic deploys behind a stale script.
      updateViaCache: "none",
    });
    scheduleCheck();
    await checkForUpdate();
  })().catch((error) =>
    console.warn("[Service Worker] Registration failed:", error),
  );
}
