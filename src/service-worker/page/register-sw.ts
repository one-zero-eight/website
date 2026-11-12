import {
  isTvPath,
  manifestPollInterval,
  resetChannelName,
  type BuildReadyNotification,
  type ClientHelloCommand,
  type ClientHelloReply,
  type ResetNotification,
} from "@/service-worker/protocol.ts";
import { withWorkerState } from "@/service-worker/storage.ts";
import {
  createAutoUpdateController,
  type AutoUpdateStatus,
} from "./auto-update.ts";
import { queryClient } from "@/app/query-client.ts";
import type { getRouter } from "@/app/router.ts";
import { setSiteUnavailable } from "./site-availability.ts";
import {
  checkManifest,
  requestWorker,
  resetStartedEvent,
} from "./sw-client.ts";

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
    message: BuildReadyNotification | ResetNotification;
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

/** TV only: a manual prompt in case a beforeunload handler cancels the automatic reload. */
export const appUpdateAvailableEvent = "app-update-available";
let isAppUpdatePending = false;

export function getIsAppUpdatePending() {
  return isAppUpdatePending;
}

function setAppUpdatePending(value: boolean) {
  isAppUpdatePending = value;
  window.dispatchEvent(new Event(appUpdateAvailableEvent));
}

/**
 * Page-side controller for the site-update feature.
 *
 * Reports this page's build to the worker, and checks for a deployment on
 * schedule, on return to the page and when connectivity returns. Fully ready
 * updates reload by default; components can pause them with useAutoUpdateBlocker.
 */
export function registerServiceWorker(router: ReturnType<typeof getRouter>) {
  if (!("serviceWorker" in navigator)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let checking = false;
  let checkRequested = false;
  let pathname = window.location.pathname;
  let nextCheckAt: string | null = null;
  let navigationSourceReceived = false;

  const autoUpdates = createAutoUpdateController({
    isNavigationIdle: () =>
      router.state.status === "idle" &&
      !router.state.isLoading &&
      router.state.matches.length > 0,
    onStatusChange: (status) => {
      pageWorkerCommunication.autoUpdate = status;
    },
    reload: () => {
      if (isTvPath(window.location.pathname)) setAppUpdatePending(true);
      window.location.reload();
    },
  });

  /** Failures are recorded for diagnostics; the next report retries. */
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
      // Only this document's own navigation decides; a later successful check clears it.
      if (!navigationSourceReceived && report.reply.navigationSource !== null) {
        navigationSourceReceived = true;
        setSiteUnavailable(report.reply.navigationSource === "cache");
      }
    } catch (error) {
      report.error = error instanceof Error ? error.message : String(error);
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
    // Offline checks would only fail; the online event triggers one later.
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
      await checkManifest();
    } catch (error) {
      console.warn("[Service Worker] Update check failed:", error);
    } finally {
      checking = false;
      scheduleCheck();
      void sendHello();
      autoUpdates.recheck();
      if (checkRequested) {
        checkRequested = false;
        void checkForUpdate();
      }
    }
  }

  function handleRouteChange() {
    autoUpdates.recheck();
    if (pathname === window.location.pathname) return;
    pathname = window.location.pathname;
    // Leaving a route dismisses a pending update prompt.
    if (isAppUpdatePending) setAppUpdatePending(false);
    scheduleCheck();
    void sendHello();
  }

  function handlePageReturn() {
    handleRouteChange();
    void checkForUpdate();
  }

  function stop() {
    stopped = true;
    autoUpdates.stop();
    clearTimeout(timer);
  }

  function recordNotification(
    message: BuildReadyNotification | ResetNotification,
    sourceScriptURL: string | null,
  ) {
    pageWorkerCommunication.lastNotification = {
      message,
      sourceScriptURL,
      receivedAt: new Date().toISOString(),
    };
  }

  navigator.serviceWorker.addEventListener(
    "message",
    (event: MessageEvent<BuildReadyNotification>) => {
      recordNotification(
        event.data,
        event.source instanceof ServiceWorker ? event.source.scriptURL : null,
      );
      if (event.data.type === "BUILD_READY" && !stopped)
        autoUpdates.handleBuildReady(event.data);
    },
  );
  new BroadcastChannel(resetChannelName).onmessage = (
    event: MessageEvent<ResetNotification>,
  ) => {
    recordNotification(event.data, null);
    stop();
    void queryClient.cancelQueries().then(() => queryClient.clear());
  };
  window.addEventListener(resetStartedEvent, stop);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    scheduleCheck();
    void checkForUpdate();
  });
  window.addEventListener("online", () => void checkForUpdate());
  window.addEventListener("pageshow", handlePageReturn);
  window.addEventListener("focus", handlePageReturn);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handlePageReturn();
  });
  router.subscribe("onResolved", handleRouteChange);

  // Report cached navigation even when offline SW re-registration cannot reach sw.js.
  void sendHello();

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
