import { $clubs } from "@/api/clubs";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function ClubsTabs() {
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

  return (
    <div className="border-b-inh-secondary-hover flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/clubs">List</TabLink>
      <TabLink to="/clubs/new">Create new</TabLink>
      {clubsUser?.role === "admin" && (
        <TabLink to="/clubs/admin">Admin</TabLink>
      )}
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
