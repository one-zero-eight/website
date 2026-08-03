import { $boardGames } from "@/api/board-games";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function BoardGamesTabs() {
  const { data: user } = $boardGames.useQuery("get", "/users/me");

  return (
    <div className="border-base-300 flex shrink-0 gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/board-games">Games</TabLink>
      {user?.role === "admin" && (
        <TabLink to="/board-games/admin">Admin</TabLink>
      )}
    </div>
  );
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
