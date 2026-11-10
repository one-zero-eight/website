import {
  useBlocker,
  type RegisteredRouter,
  type UseBlockerOpts,
} from "@tanstack/react-router";

function shouldBlockNavigation() {
  return false;
}

/**
 * Pauses automatic application reloads while this component has active work.
 * Must be called inside the application's TanStack Router provider.
 *
 * @param enabled Whether to pause auto-updates. Defaults to `true` for the
 * entire mounted lifetime. Pass a condition to block only while work is active.
 * Changing it to `false` or unmounting releases this blocker. Pending verified
 * updates can resume once all blockers are released.
 * @param options Optional TanStack blocker settings. By default manual
 * navigation, F5/reload and closing the tab are allowed without confirmation.
 * Supply `shouldBlockFn` to guard navigation and `enableBeforeUnload` to guard
 * unload. Use `enabled`, not `disabled`, to control this blocker's lifetime.
 *
 * Automatic updates never invoke `shouldBlockFn` or open its confirmation UI;
 * they wait until all active blockers are released.
 *
 * @returns TanStack's blocker resolver when `withResolver: true` is supplied.
 *
 * @example
 * useAutoUpdateBlocker(searchQuery.length > 0);
 *
 * @example
 * useAutoUpdateBlocker(isDirty, {
 *   shouldBlockFn: () => !window.confirm("Discard unsaved changes?"),
 *   enableBeforeUnload: true,
 * });
 */
export function useAutoUpdateBlocker<TWithResolver extends boolean = false>(
  enabled = true,
  {
    shouldBlockFn = shouldBlockNavigation,
    enableBeforeUnload = false,
    withResolver,
  }: Partial<
    Omit<UseBlockerOpts<RegisteredRouter, TWithResolver>, "disabled">
  > = {},
) {
  return useBlocker<RegisteredRouter, TWithResolver>({
    disabled: !enabled,
    shouldBlockFn,
    enableBeforeUnload,
    withResolver,
  });
}
