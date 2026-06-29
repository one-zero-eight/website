import { Link, ValidateLinkOptions } from "@tanstack/react-router";
// import { $clubs } from "@/api/clubs";

export function TabletennisTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
      <TabLink to="/tabletennis">Profile</TabLink>
      <TabLink to="/tabletennis/players">Players</TabLink>
      <TabLink to="/tabletennis/matches">My matches</TabLink>
      <TabLink to="/tabletennis/tournaments">Tournaments</TabLink>
      <TabLink to="/tabletennis/events">Events</TabLink>
      {/* {clubsUser?.role === "admin" && (
        <TabLink to="/clubs/admin">Admin</TabLink>
      )} */}
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
