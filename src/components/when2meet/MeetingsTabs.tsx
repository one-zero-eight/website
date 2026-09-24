import { MeetingStatus } from "@/api/when2meet/types.ts";
import { Link } from "@tanstack/react-router";

export function MeetingsTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      {[
        { status: MeetingStatus.active, label: "Active" },
        { status: MeetingStatus.archived, label: "Archived" },
      ].map(({ status, label }) => (
        <Link
          key={status}
          to="/when2meet"
          search={{ status }}
          className="px-3 py-2.5"
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{ className: "border-b-2 border-b-primary" }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
