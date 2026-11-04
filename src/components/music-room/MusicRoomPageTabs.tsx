import { Trans } from "@lingui/react/macro";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function MusicRoomPageTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/music-room">
        <Trans>Calendar</Trans>
      </TabLink>
      <TabLink to="/music-room/instructions">
        <Trans>Instructions</Trans>
      </TabLink>
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
