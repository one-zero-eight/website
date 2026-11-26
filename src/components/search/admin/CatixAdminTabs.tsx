import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function CatixAdminTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/search/admin" exact>
        <Trans>Telegram</Trans>
      </TabLink>
      <TabLink to="/search/admin/max" exact={false}>
        <Trans>MAX</Trans>
      </TabLink>
      <TabLink to="/search/admin/proposals" exact>
        <Trans>Proposals</Trans>
      </TabLink>
      <TabLink to="/search/admin/abuse" exact>
        <Trans>Abuse</Trans>
      </TabLink>
      <TabLink to="/search/admin/admins" exact>
        <Trans>Admins</Trans>
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
