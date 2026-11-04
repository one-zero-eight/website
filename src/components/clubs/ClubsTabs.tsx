import { $clubs } from "@/api/clubs";
import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function ClubsTabs() {
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/clubs">
        <Trans>List</Trans>
      </TabLink>
      <TabLink to="/clubs/new">
        <Trans>Create new</Trans>
      </TabLink>
      <TabLink to="/clubs/league">
        <Trans>Club league</Trans>
      </TabLink>
      {clubsUser?.role === "admin" && (
        <>
          <TabLink to="/clubs/admin">
            <Trans>Admin</Trans>
          </TabLink>
          <TabLink to="/clubs/review">
            <Trans>Review Changes</Trans>
          </TabLink>
        </>
      )}
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-3 py-2.5"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
