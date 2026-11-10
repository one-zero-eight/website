import { useEffect } from "react";
import { registerAutoReloadBlocker } from "./auto-update-safety.ts";

/**
 * Pauses automatic application reloads while this component has active work.
 * Does not depend on TanStack Router or require a RouterProvider.
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
    return registerAutoReloadBlocker();
  }, [enabled]);
}
