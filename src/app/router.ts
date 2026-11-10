import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./route-tree.gen.ts";

export function getRouter() {
  // Create the router instance from the generated route tree
  return createRouter({
    routeTree,

    // Set the initial context. It will be passed in app.tsx
    context: {
      isAuthenticated: false,
    },
  });
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
