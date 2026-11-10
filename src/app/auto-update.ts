import type { BuildReadyNotification } from "@/service-worker/protocol.ts";
import { useEffect } from "react";
import { queryClient } from "./query-client.ts";
import { checkManifest } from "./sw-client.ts";

/** Remembers the target across the reload, so a failed update cannot loop. */
export const autoReloadTargetStorageKey = "innohassle-auto-reload-target";
export const blockersChangedEvent = "app-auto-update-blockers-changed";

export type AutoUpdateBlockReason =
  | "offline"
  | "navigation"
  | "mutation"
  | "component-blocker"
  | "already-attempted"
  | "verifying"
  | "not-ready"
  | "check-failed"
  | "stopped";

export type AutoUpdateStatus = {
  pendingBuildId: string | null;
  blockedReason: AutoUpdateBlockReason | null;
  lastReloadAttemptAt: string | null;
};

const blockers = new Set<symbol>();

/** Pause automatic reloads until the returned function is called. In components, use useAutoUpdateBlocker. */
export function registerAutoUpdateBlocker() {
  const blocker = Symbol("auto-update-blocker");
  blockers.add(blocker);
  window.dispatchEvent(new Event(blockersChangedEvent));
  return () => {
    blockers.delete(blocker);
    window.dispatchEvent(new Event(blockersChangedEvent));
  };
}

export function hasAutoUpdateBlocker() {
  return blockers.size > 0;
}

/**
 * Pauses automatic application reloads while this component has active work.
 *
 * @param enabled Whether to pause auto-updates. Defaults to `true` for the
 * entire mounted lifetime. Pass a condition to block only while work is active.
 * Changing it to `false` or unmounting releases this blocker. Pending verified
 * updates can resume once all blockers are released.
 *
 * Does not block manual navigation, F5/reload or closing the tab, and does not
 * show confirmation dialogs. Use TanStack Router's `useBlocker` separately
 * when navigation or before-unload protection is also needed.
 *
 * @example
 * useAutoUpdateBlocker(searchQuery.length > 0);
 */
export function useAutoUpdateBlocker(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return registerAutoUpdateBlocker();
  }, [enabled]);
}

/**
 * Page-side owner of automatic reloads. A BUILD_READY from the worker only
 * triggers a check: the target is the server's current build, once it is
 * completely ready and differs from this page's build. Builds are not ordered,
 * so rolling back to an older build updates the tabs too.
 *
 * Pages update by default, unless offline, navigating, mutating, or a
 * component registered a blocker. Never opens confirmation UI.
 */
export function createAutoUpdateController({
  isNavigationIdle,
  reload,
  onStatusChange,
}: {
  isNavigationIdle: () => boolean;
  reload: () => void;
  onStatusChange: (status: AutoUpdateStatus) => void;
}) {
  /** The build to switch to: announced, then confirmed by the server. */
  let pendingBuildId: string | null = null;
  let verifying = false;
  let stopped = false;
  let checkTimer: number | undefined;
  const status: AutoUpdateStatus = {
    pendingBuildId: null,
    blockedReason: null,
    lastReloadAttemptAt: null,
  };

  function reportStatus(blockedReason: AutoUpdateBlockReason | null) {
    status.pendingBuildId = pendingBuildId;
    status.blockedReason = blockedReason;
    onStatusChange({ ...status });
  }

  function getBlockReason(buildId: string): AutoUpdateBlockReason | null {
    if (sessionStorage.getItem(autoReloadTargetStorageKey) === buildId)
      return "already-attempted";
    if (!navigator.onLine) return "offline";
    if (!isNavigationIdle()) return "navigation";
    if (queryClient.isMutating() > 0) return "mutation";
    if (hasAutoUpdateBlocker()) return "component-blocker";
    return null;
  }

  function scheduleCheck() {
    if (stopped || !pendingBuildId) return;
    window.clearTimeout(checkTimer);
    // Let the current render install/remove its component blockers first.
    checkTimer = window.setTimeout(() => {
      void applyPendingBuild().catch((error) => {
        if (stopped) return;
        reportStatus("check-failed");
        console.warn("[Service Worker] Automatic update check failed:", error);
      });
    }, 0);
  }

  async function applyPendingBuild() {
    if (stopped || verifying || !pendingBuildId) return;
    let candidate = pendingBuildId;
    const blockedReason = getBlockReason(candidate);
    reportStatus(blockedReason);
    if (blockedReason) return;
    verifying = true;
    reportStatus("verifying");
    try {
      // A re-announced BUILD_READY alone does not prove that the server is
      // reachable; the worker answers only after the build is completely ready.
      const latest = await checkManifest();
      if (stopped || pendingBuildId !== candidate) return;
      if (!latest) {
        reportStatus("not-ready");
        return;
      }
      if (latest.buildId === BUILD_INFO.buildId) {
        // An announcement of another build, but the server serves this one.
        pendingBuildId = null;
        reportStatus(null);
        return;
      }
      pendingBuildId = candidate = latest.buildId;
      // A component blocker, mutation or navigation may have started meanwhile.
      const finalBlockedReason = getBlockReason(candidate);
      reportStatus(finalBlockedReason);
      if (finalBlockedReason) return;
      sessionStorage.setItem(autoReloadTargetStorageKey, candidate);
      status.lastReloadAttemptAt = new Date().toISOString();
      reportStatus(null);
      reload();
    } finally {
      verifying = false;
      // Another build was announced during the check.
      if (!stopped && pendingBuildId && pendingBuildId !== candidate)
        scheduleCheck();
    }
  }

  window.addEventListener(blockersChangedEvent, scheduleCheck);
  const unsubscribeMutations = queryClient
    .getMutationCache()
    .subscribe(scheduleCheck);

  return {
    handleBuildReady({ buildInfo }: BuildReadyNotification) {
      if (stopped || buildInfo.buildId === BUILD_INFO.buildId) return;
      pendingBuildId = buildInfo.buildId;
      scheduleCheck();
    },
    recheck: scheduleCheck,
    stop() {
      if (stopped) return;
      stopped = true;
      pendingBuildId = null;
      window.clearTimeout(checkTimer);
      window.removeEventListener(blockersChangedEvent, scheduleCheck);
      unsubscribeMutations();
      reportStatus("stopped");
    },
  };
}
