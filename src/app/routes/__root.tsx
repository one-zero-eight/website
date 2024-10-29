import OfflineNotification from "@/components/layout/Offline.tsx";
import Sidebar from "@/components/layout/Sidebar.tsx";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

interface RouterContext {
  isAuthenticated: boolean;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Root component
  component: function RouteComponent() {
    // Build canonical URL for the current page
    const canonical = useLocation({
      select: ({ href }) => new URL(href, "https://innohassle.ru").toString(),
    });

    return (
      <>
        <OfflineNotification />
        <Helmet
          titleTemplate="%s — InNoHassle"
          defaultTitle="InNoHassle"
          // Update immediately, even when tab is not focused
          defer={false}
        >
          <link rel="canonical" href={canonical} />
        </Helmet>

        <ScrollRestoration />
        <Outlet />
      </>
    );
  },

  // 404 page
  notFoundComponent: () => (
    <div className="flex h-full flex-row">
      <Sidebar>
        <div className="flex min-h-full grow flex-col items-center justify-center overflow-y-auto @container/content">
          <h1 className="mb-4 text-4xl font-bold">404 / not found</h1>
          <Link to="/dashboard" className="selected">
            Go to dashboard
          </Link>
        </div>
      </Sidebar>
    </div>
  ),
});
