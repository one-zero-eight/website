import { $boardGames } from "@/api/board-games";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_with_menu/board-games/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <RequireBoardGamesAdmin>
        <Outlet />
      </RequireBoardGamesAdmin>
    </RequireAuth>
  );
}

function RequireBoardGamesAdmin({ children }: { children: ReactNode }) {
  const { t } = useLingui();
  const {
    data: user,
    isPending,
    isError,
    error,
  } = $boardGames.useQuery("get", "/users/me");

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error mx-auto w-full max-w-6xl">
        <span className="icon-[material-symbols--error-outline] shrink-0 text-xl" />
        <div>
          <p className="font-semibold">{t`Could not check access`}</p>
          <p className="text-sm">{formatApiErrorMessage(error)}</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <p className="text-base-content/60 mx-auto w-full max-w-6xl p-4">
        <Trans>You do not have access to board games admin.</Trans>
      </p>
    );
  }

  return <>{children}</>;
}
