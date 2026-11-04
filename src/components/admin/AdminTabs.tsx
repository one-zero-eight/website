import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function AdminTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/admin" exact>
        <Trans>Home</Trans>
      </TabLink>
      <TabLink to="/admin/users" exact={false}>
        <Trans>Users</Trans>
      </TabLink>
      <TabLink to="/admin/predefined" exact>
        <Trans>Predefined</Trans>
      </TabLink>
      <TabLink to="/admin/rooms" exact>
        <Trans>Rooms</Trans>
      </TabLink>
      <TabLink to="/admin/academic-calendars" exact>
        <Trans>Academic calendars</Trans>
      </TabLink>
    </div>
  );
}

function TabLink({
  exact,
  ...props
}: ValidateLinkOptions & { exact: boolean }) {
  return (
    <Link
      className="px-3 py-2.5"
      activeOptions={{ exact, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
