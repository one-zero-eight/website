import type { BuildInfo } from "@/service-worker/protocol.ts";

export const autoUpdateSafetyChangedEvent = "app-auto-update-safety-changed";
export const autoReloadTargetStorageKey = "innohassle-auto-reload-target";

const autoReloadBlockers = new Set<symbol>();

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

/** Register one auto-update blocker independently of navigation. Dispose it when work ends. */
export function registerAutoReloadBlocker() {
  const blocker = Symbol("auto-update-blocker");
  autoReloadBlockers.add(blocker);
  window.dispatchEvent(new Event(autoUpdateSafetyChangedEvent));
  return () => {
    autoReloadBlockers.delete(blocker);
    window.dispatchEvent(new Event(autoUpdateSafetyChangedEvent));
  };
}

export function hasAutoReloadBlocker() {
  return autoReloadBlockers.size > 0;
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
  hasComponentBlocker,
  alreadyAttempted,
}: {
  online: boolean;
  navigationIdle: boolean;
  hasPendingMutations: boolean;
  hasComponentBlocker: boolean;
  alreadyAttempted: boolean;
}): AutoUpdateBlockReason | null {
  if (alreadyAttempted) return "already-attempted";
  if (!online) return "offline";
  if (!navigationIdle) return "navigation";
  if (hasPendingMutations) return "mutation";
  if (hasComponentBlocker) return "component-blocker";
  return null;
}
