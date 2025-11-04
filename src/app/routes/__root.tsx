import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";
import OfflineNotification from "@/components/layout/Offline.tsx";
import Sidebar from "@/components/layout/Sidebar.tsx";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

interface RouterContext {
  isAuthenticated: boolean;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Root component
  component: RouteComponent,

  // 404 page
  notFoundComponent: () => (
    <div className="flex h-full flex-col">
      <div className="flex grow">
        <Sidebar />

        <div className="@container/content flex min-h-full grow flex-col items-center justify-center overflow-y-auto">
          <h1 className="mb-4 text-4xl font-bold">404 / not found</h1>
          <Link to="/dashboard" className="selected">
            Go to dashboard
          </Link>
        </div>
      </div>

      <BottomNavigation />
    </div>
  ),

  // 403 page
  errorComponent: ({ error }) => {
    if (error?.message?.includes("403")) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex grow">
            <Sidebar />

            <div className="@container/content flex min-h-full grow flex-col items-center justify-center overflow-y-auto">
              <h1 className="mb-2 text-4xl font-bold">403 / forbidden</h1>
              <p className="text-base-content/70 mb-4">
                You don't have permission to access this page.
              </p>
              <Link to="/dashboard" className="selected">
                Go to dashboard
              </Link>
            </div>
          </div>

          <BottomNavigation />
        </div>
      );
    }
  },
});

function RouteComponent() {
  // Build canonical URL for the current page
  const canonical = useLocation({
    select: ({ href }) => new URL(href, "https://innohassle.ru").toString(),
  });

  return (
    <>
      <Helmet
        titleTemplate="%s — InNoHassle"
        defaultTitle="InNoHassle"
        // Update immediately, even when tab is not focused
        defer={false}
      >
        <link rel="canonical" href={canonical} />
      </Helmet>

      <OfflineNotification />
      <Outlet />
    </>
  );
}
