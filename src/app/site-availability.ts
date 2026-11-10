import { useSyncExternalStore } from "react";

// Cached navigation reports site unavailability; a successful manifest check clears it.
// Browser connectivity and account API availability are separate signals.
let isSiteUnavailable = false;
const listeners = new Set<() => void>();

export function setSiteUnavailable(value: boolean) {
  if (isSiteUnavailable === value) return;
  isSiteUnavailable = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return isSiteUnavailable;
}

export function useSiteUnavailable() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
