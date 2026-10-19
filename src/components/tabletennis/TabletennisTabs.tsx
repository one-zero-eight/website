import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function TabletennisTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/tabletennis">
        <Trans>Profile</Trans>
      </TabLink>
      <TabLink to="/tabletennis/players">
        <Trans>Players</Trans>
      </TabLink>
      <TabLink to="/tabletennis/matches">
        <Trans>My matches</Trans>
      </TabLink>
      <TabLink to="/tabletennis/tournaments">
        <Trans>Tournaments</Trans>
      </TabLink>
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-3 py-2.5"
      activeOptions={{ exact: true, includeSearch: false }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
