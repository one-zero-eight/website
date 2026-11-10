import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./route-tree.gen.ts";
import { registerAutoReloadBlocker } from "./auto-update-safety.ts";

export function getRouter() {
  // Create the router instance from the generated route tree
  const router = createRouter({
    routeTree,

    // Set the initial context. It will be passed in app.tsx
    context: {
      isAuthenticated: false,
    },
  });
  // Active useBlocker registrations pause automatic updates without invoking shouldBlockFn.
  // `disabled` controls the registration; enableBeforeUnload only controls manual F5/unload.
  const blockHistory = router.history.block.bind(router.history);
  router.history.block = (blocker) => {
    const unblock = blockHistory(blocker);
    const removeAutoReloadBlocker = registerAutoReloadBlocker();
    return () => {
      unblock();
      removeAutoReloadBlocker();
    };
  };

  router.subscribe("onResolved", () =>
    window.dispatchEvent(new Event("sw-route-changed")),
  );
  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
