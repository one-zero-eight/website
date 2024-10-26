import Sidebar from "@/components/layout/Sidebar.tsx";
import OfflineNotification from "@/components/layout/OfflineNotification.tsx";
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
    <div className="flex flex-row">
      <Sidebar>
        <main className="w-full @container/main">
          <div className="flex h-[100dvh] flex-row justify-center p-4 @container/content @2xl/main:p-12">
            <div className="flex flex-col justify-center text-center">
              <h1 className="mb-8 text-4xl font-bold">404 / not found</h1>
              <Link to="/" className="selected">
                Go to main
              </Link>
            </div>
          </div>
        </main>
      </Sidebar>
    </div>
  ),
});
