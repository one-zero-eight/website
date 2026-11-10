import {
  autoReloadTargetStorageKey,
  autoUpdateSafetyChangedEvent,
  getAutoUpdateBlockReason,
  hasAutoReloadBlocker,
  isNewerAppBuild,
  type AutoUpdateBlockReason,
} from "./auto-update-safety.ts";
import { queryClient } from "./query-client.ts";
import { setSiteUnavailable } from "./site-availability.ts";
import { requestWorker } from "./sw-client.ts";
import type {
  BuildInfo,
  WorkerNotification,
  WorkerState,
} from "@/service-worker/protocol.ts";

export type AutoUpdateStatus = {
  pendingBuildId: string | null;
  blockedReason: AutoUpdateBlockReason | null;
  lastReloadAttemptAt: string | null;
};

type ReadyBuild = Extract<WorkerNotification, { type: "BUILD_READY" }>;

/** Page-side owner of safe automatic reloads. It never invokes route confirmation functions. */
export function createAutoUpdateController({
  isNavigationIdle,
  reload,
  onStatusChange,
}: {
  isNavigationIdle: () => boolean;
  reload: () => void;
  onStatusChange: (status: AutoUpdateStatus) => void;
}) {
  let pendingBuild: ReadyBuild | null = null;
  let verifying = false;
  let stopped = false;
  let checkTimer: number | undefined;
  const reloadAttempts = new Set<string>();
  const status: AutoUpdateStatus = {
    pendingBuildId: null,
    blockedReason: null,
    lastReloadAttemptAt: null,
  };

  function reportStatus(blockedReason: AutoUpdateBlockReason | null) {
    status.pendingBuildId = pendingBuild?.buildInfo.buildId ?? null;
    status.blockedReason = blockedReason;
    onStatusChange({ ...status });
  }

  function readBlockReason(candidate: ReadyBuild) {
    return getAutoUpdateBlockReason({
      online: navigator.onLine,
      navigationIdle: isNavigationIdle(),
      hasPendingMutations: queryClient.isMutating() > 0,
      hasComponentBlocker: hasAutoReloadBlocker(),
      alreadyAttempted:
        reloadAttempts.has(candidate.buildInfo.buildId) ||
        sessionStorage.getItem(autoReloadTargetStorageKey) ===
          candidate.buildInfo.buildId,
    });
  }

  function scheduleCheck() {
    if (stopped || !pendingBuild) return;
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
    if (stopped || verifying || !pendingBuild) return;
    const candidate = pendingBuild;
    const blockedReason = readBlockReason(candidate);
    reportStatus(blockedReason);
    if (blockedReason) return;
    verifying = true;
    reportStatus("verifying");
    try {
      // A cached BUILD_READY re-announcement alone is not evidence that the server is reachable.
      const latest = await requestWorker<BuildInfo | null>({
        type: "CHECK_MANIFEST",
      });
      if (stopped || pendingBuild !== candidate) return;
      if (!latest || latest.buildId !== candidate.buildInfo.buildId) {
        reportStatus("not-ready");
        return;
      }
      setSiteUnavailable(false);
      const state = await requestWorker<WorkerState>({ type: "GET_STATE" });
      const ready = state.builds.find(
        (build) => build.manifest.buildInfo.buildId === latest.buildId,
      );
      if (stopped || pendingBuild !== candidate) return;
      if (
        state.blocked ||
        state.generation !== candidate.generation ||
        state.latestReadyBuildId !== latest.buildId ||
        ready?.state !== "ready" ||
        ready.completed !== ready.manifest.resources.length
      ) {
        reportStatus("not-ready");
        return;
      }
      // A component blocker, mutation or navigation may have started during verification.
      const finalBlockedReason = readBlockReason(candidate);
      reportStatus(finalBlockedReason);
      if (finalBlockedReason) return;
      sessionStorage.setItem(autoReloadTargetStorageKey, latest.buildId);
      reloadAttempts.add(latest.buildId);
      status.lastReloadAttemptAt = new Date().toISOString();
      reportStatus(null);
      reload();
    } finally {
      verifying = false;
      if (!stopped && pendingBuild !== candidate) scheduleCheck();
    }
  }

  window.addEventListener(autoUpdateSafetyChangedEvent, scheduleCheck);
  const unsubscribeMutations = queryClient
    .getMutationCache()
    .subscribe(scheduleCheck);

  return {
    handleBuildReady(message: ReadyBuild) {
      if (stopped || !isNewerAppBuild(message.buildInfo, BUILD_INFO)) return;
      if (
        pendingBuild &&
        message.buildInfo.buildId !== pendingBuild.buildInfo.buildId &&
        !isNewerAppBuild(message.buildInfo, pendingBuild.buildInfo)
      )
        return;
      if (
        !pendingBuild ||
        pendingBuild.buildInfo.buildId !== message.buildInfo.buildId ||
        pendingBuild.generation !== message.generation
      ) {
        pendingBuild = message;
      }
      scheduleCheck();
    },
    recheck: scheduleCheck,
    stop() {
      if (stopped) return;
      stopped = true;
      pendingBuild = null;
      window.clearTimeout(checkTimer);
      window.removeEventListener(autoUpdateSafetyChangedEvent, scheduleCheck);
      unsubscribeMutations();
      reportStatus("stopped");
    },
  };
}
