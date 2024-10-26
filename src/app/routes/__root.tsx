import Sidebar from "@/components/layout/Sidebar.tsx";
import OfflineNotification from "@/components/layout/Offline.tsx";
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
        <Helmet titleTemplate="%s — InNoHassle" defaultTitle="InNoHassle">
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
        <div className="flex h-full flex-grow flex-col">
          <div className="flex h-full flex-col justify-center text-center @container/content">
            <h1 className="mb-4 text-4xl font-bold">404 / not found</h1>
            <Link to="/" className="selected">
              Go to dashboard
            </Link>
          </div>
        </div>
      </Sidebar>
    </div>
  ),
});
