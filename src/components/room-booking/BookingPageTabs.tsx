import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function BookingPageTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      <TabLink to="/room-booking">Timeline</TabLink>
      <TabLink to="/room-booking/list">My bookings</TabLink>
      <TabLink
        to="/room-booking/rooms"
        activeOptions={{ exact: false, includeSearch: true }}
      >
        Rooms
      </TabLink>
      <TabLink to="/room-booking/rules">Rules</TabLink>
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
