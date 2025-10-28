import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function MusicRoomPageTabs() {
  return (
    <div className="flex shrink-0 flex-row gap-1 overflow-x-auto whitespace-nowrap border-b-[1px] border-b-secondary-hover px-2">
      <TabLink to="/music-room">Calendar</TabLink>
      <TabLink to="/music-room/instructions">Instructions</TabLink>
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
