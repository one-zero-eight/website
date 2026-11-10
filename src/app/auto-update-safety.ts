import type { BuildInfo } from "@/service-worker/protocol.ts";

export const autoUpdateSafetyChangedEvent = "app-auto-update-safety-changed";
export const autoReloadTargetStorageKey = "innohassle-auto-reload-target";

const navigationBlockers = new Set<symbol>();

export type AutoUpdateBlockReason =
  | "offline"
  | "navigation"
  | "mutation"
  | "navigation-blocker"
  | "already-attempted"
  | "verifying"
  | "not-ready"
  | "check-failed"
  | "stopped";

/** An active TanStack useBlocker also pauses auto-updates, even with enableBeforeUnload: false. */
export function registerAutoReloadBlocker() {
  const blocker = Symbol("navigation-blocker");
  navigationBlockers.add(blocker);
  window.dispatchEvent(new Event(autoUpdateSafetyChangedEvent));
  return () => {
    navigationBlockers.delete(blocker);
    window.dispatchEvent(new Event(autoUpdateSafetyChangedEvent));
  };
}

export function hasAutoReloadBlocker() {
  return navigationBlockers.size > 0;
}

export function isNewerAppBuild(candidate: BuildInfo, current: BuildInfo) {
  return (
    candidate.buildId !== current.buildId &&
    Date.parse(candidate.builtAt) > Date.parse(current.builtAt)
  );
}

/** Auto-update is allowed everywhere by default; components opt out with useAutoUpdateBlocker. */
export function getAutoUpdateBlockReason({
  online,
  navigationIdle,
  hasPendingMutations,
  hasNavigationBlocker,
  alreadyAttempted,
}: {
  online: boolean;
  navigationIdle: boolean;
  hasPendingMutations: boolean;
  hasNavigationBlocker: boolean;
  alreadyAttempted: boolean;
}): AutoUpdateBlockReason | null {
  if (alreadyAttempted) return "already-attempted";
  if (!online) return "offline";
  if (!navigationIdle) return "navigation";
  if (hasPendingMutations) return "mutation";
  if (hasNavigationBlocker) return "navigation-blocker";
  return null;
}
