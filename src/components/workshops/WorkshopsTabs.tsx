import { $workshops } from "@/api/workshops";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function WorkshopsTabs() {
  const { data: workshopsUser } = $workshops.useQuery("get", "/users/me");

  if (workshopsUser?.role !== "admin") {
    return null; // Do not show tabs if the user is not an admin
  }

  return (
    <div className="border-b-secondary-hover flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/events">Check in</TabLink>
      <TabLink to="/events/admin">Admin</TabLink>
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-brand-violet" }}
      {...props}
    />
  );
}
