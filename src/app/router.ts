import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./route-tree.gen.ts";

export function getRouter() {
  let renderedPathname: string | undefined;

  // Create the router instance from the generated route tree
  return createRouter({
    routeTree,

    // Set the initial context. It will be passed in app.tsx
    context: {
      isAuthenticated: false,
    },

    // Restore scroll (we have layout where the content is scrolled inside div)
    scrollRestoration: ({ location }) => {
      const isNewPage = location.pathname !== renderedPathname;
      renderedPathname = location.pathname;
      return isNewPage;
    },
    scrollToTopSelectors: ['[data-scroll-restoration-id="content"]'],
  });
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
