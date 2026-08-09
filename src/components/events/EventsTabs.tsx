import { Link, ValidateLinkOptions } from "@tanstack/react-router";
import { useEventsAuth } from "./hooks";

export function EventsTabs() {
  const { canManage, isModerator } = useEventsAuth();

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/events" exact>
        Calendar
      </TabLink>
      {canManage && (
        <TabLink to="/events/drafts" exact={false}>
          Manage Events
        </TabLink>
      )}
      {isModerator && (
        <TabLink to="/events/submissions" exact={false}>
          Review Events
        </TabLink>
      )}
    </div>
  );
}

function TabLink({
  exact,
  ...props
}: ValidateLinkOptions & { exact: boolean }) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
