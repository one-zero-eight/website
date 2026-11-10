import { requestWorker } from "./sw-client.ts";
import {
  createAutoUpdateController,
  type AutoUpdateStatus,
} from "./auto-update.ts";
import { queryClient } from "./query-client.ts";
import { setSiteUnavailable } from "./site-availability.ts";
import {
  isTvPath,
  manifestPollInterval,
  type BuildInfo,
  type ClientHelloCommand,
  type ClientHelloReply,
  type WorkerNotification,
} from "@/service-worker/protocol.ts";
import { withWorkerState } from "@/service-worker/storage.ts";

// Page-side observations only. Worker-reported state is collected separately by RPC.
const pageWorkerCommunication: {
  lastHello: {
    message: ClientHelloCommand;
    targetScriptURL: string;
    sentAt: string;
    acknowledgedAt: string | null;
    reply: ClientHelloReply | null;
    error: string | null;
  } | null;
  lastNotification: {
    message: WorkerNotification;
    sourceScriptURL: string | null;
    receivedAt: string;
  } | null;
  autoUpdate: AutoUpdateStatus;
} = {
  lastHello: null,
  lastNotification: null,
  autoUpdate: {
    pendingBuildId: null,
    blockedReason: null,
    lastReloadAttemptAt: null,
  },
};

export function getPageWorkerCommunication() {
  return structuredClone(pageWorkerCommunication);
}

export const appUpdateAvailableEvent = "app-update-available";
let pendingUpdate: (() => void) | undefined;
export function getPendingAppUpdate() {
  return pendingUpdate;
}

/**
 * Page-side controller for the site-update feature.
 *
 * Poll on schedule and on return to the page. Fully ready updates reload by default;
 * components can pause them with useAutoUpdateBlocker.
 * TV retains its manual prompt if a native beforeunload handler blocks a reload.
 */
export function registerServiceWorker({
  isNavigationIdle,
}: {
  isNavigationIdle: () => boolean;
}) {
  if (!("serviceWorker" in navigator)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let checking = false;
  let checkRequested = false;
  let pathname = window.location.pathname;
  let nextCheckAt: string | null = null;
  let navigationSourceReceived = false;

  function handleAppReload() {
    window.location.reload();
  }

  const autoUpdates = createAutoUpdateController({
    isNavigationIdle,
    onStatusChange: (status) => {
      pageWorkerCommunication.autoUpdate = status;
    },
    reload: () => {
      if (isTvPath(window.location.pathname)) {
        pendingUpdate = handleAppReload;
        window.dispatchEvent(new Event(appUpdateAvailableEvent));
      }
      handleAppReload();
    },
  });

  async function sendHello() {
    const controller = navigator.serviceWorker.controller;
    if (!controller || stopped) return;
    const report: NonNullable<typeof pageWorkerCommunication.lastHello> = {
      message: {
        type: "CLIENT_HELLO",
        buildId: BUILD_INFO.buildId,
        pathname,
        interval: manifestPollInterval(pathname),
        nextCheckAt,
      },
      targetScriptURL: controller.scriptURL,
      sentAt: new Date().toISOString(),
      acknowledgedAt: null,
      reply: null,
      error: null,
    };
    pageWorkerCommunication.lastHello = report;
    try {
      report.reply = await requestWorker<ClientHelloReply>(
        report.message,
        controller,
      );
      report.acknowledgedAt = new Date().toISOString();
      if (!navigationSourceReceived && report.reply.navigationSource !== null) {
        navigationSourceReceived = true;
        setSiteUnavailable(report.reply.navigationSource === "cache");
      }
    } catch (error) {
      report.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
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
      const readyBuild = await requestWorker<BuildInfo | null>({
        type: "CHECK_MANIFEST",
      });
      if (readyBuild) setSiteUnavailable(false);
      window.dispatchEvent(new Event("sw-check-completed"));
    } catch (error) {
      console.warn("[Service Worker] Update check failed:", error);
    } finally {
      checking = false;
      scheduleCheck();
      void sendHello().catch(() => undefined);
      autoUpdates.recheck();
      if (checkRequested) {
        checkRequested = false;
        void checkForUpdate();
      }
    }
  }

  function handleRouteChange() {
    const nextPathname = window.location.pathname;
    if (pathname === nextPathname) {
      autoUpdates.recheck();
      return;
    }
    pathname = nextPathname;
    autoUpdates.recheck();
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
    autoUpdates.stop();
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
      pageWorkerCommunication.lastNotification = {
        message,
        sourceScriptURL:
          event.source instanceof ServiceWorker ? event.source.scriptURL : null,
        receivedAt: new Date().toISOString(),
      };
      if (message.type === "CACHE_INVALIDATED") {
        handleCacheInvalidated(message);
        return;
      }
      if (message.type === "BUILD_READY" && !stopped)
        autoUpdates.handleBuildReady(message);
    },
  );
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    scheduleCheck();
    void checkForUpdate();
  });
  window.addEventListener("sw-reset-started", () => {
    stopped = true;
    autoUpdates.stop();
    clearTimeout(timer);
  });
  window.addEventListener("online", () => void checkForUpdate());
  function handlePageReturn() {
    handleRouteChange();
    void sendHello().catch(() => undefined);
    void checkForUpdate();
  }
  window.addEventListener("pageshow", handlePageReturn);
  window.addEventListener("focus", handlePageReturn);
  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("sw-route-changed", handleRouteChange);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handlePageReturn();
  });

  // Report cached navigation even when offline SW re-registration cannot reach sw.js.
  void sendHello().catch(() => undefined);

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
