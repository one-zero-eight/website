import { Trans } from "@lingui/react/macro";
import { AutoSignIn } from "@/api/accounts/sign-in.tsx";
import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";
import { ConnectivityNotification } from "@/components/layout/Offline.tsx";
import Sidebar from "@/components/layout/Sidebar.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

interface RouterContext {
  isAuthenticated: boolean;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Root component
  component: RouteComponent,

  // 404 page
  notFoundComponent: () => (
    <div className="flex h-full flex-col">
      <Helmet>
        <title>404</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex grow">
        <Sidebar />

        <div className="@container/content flex min-h-full grow flex-col items-center justify-center overflow-y-auto">
          <h1 className="mb-4 text-4xl font-bold">
            <Trans>404 / not found</Trans>
          </h1>
          <Link to="/dashboard" className="selected">
            <Trans>Go to dashboard</Trans>
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
          <Helmet>
            <title>403</title>
            <meta name="robots" content="noindex" />
          </Helmet>

          <div className="flex grow">
            <Sidebar />

            <div className="@container/content flex min-h-full grow flex-col items-center justify-center overflow-y-auto">
              <h1 className="mb-2 text-4xl font-bold">
                <Trans>403 / forbidden</Trans>
              </h1>
              <p className="text-base-content/70 mb-4">
                <Trans>You don't have permission to access this page.</Trans>
              </p>
              <Link to="/dashboard" className="selected">
                <Trans>Go to dashboard</Trans>
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
    select: ({ href }) => {
      const url = new URL(href, "https://innohassle.ru");
      url.search = ""; // Remove query params
      return url.toString();
    },
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

      <ConnectivityNotification />
      <AutoSignIn />
      <Outlet />
    </>
  );
}
