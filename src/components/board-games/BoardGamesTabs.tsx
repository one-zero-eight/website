import { $boardGames } from "@/api/board-games";
import { QueryError } from "@/components/board-games/shared.tsx";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function BoardGamesTabs() {
  const { data: user } = $boardGames.useQuery("get", "/users/me");

  return (
    <div className="border-base-300 flex shrink-0 gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/board-games">Games</TabLink>
      {user?.role === "admin" && (
        <TabLink
          to="/board-games/admin"
          activeOptions={{ exact: false, includeSearch: false }}
        >
          Admin
        </TabLink>
      )}
    </div>
  );
}

export function RequireBoardGamesAdmin({ children }: { children: ReactNode }) {
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
      <div className="mx-auto w-full max-w-6xl p-4">
        <QueryError title="Could not check access" error={error} />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <p className="text-base-content/60 mx-auto w-full max-w-6xl p-4">
        You do not have access to board games admin.
      </p>
    );
  }

  return children;
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-primary border-b-2" }}
      {...props}
    />
  );
}
