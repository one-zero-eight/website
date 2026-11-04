import { MeetingStatus } from "@/api/when2meet/types.ts";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";

const tabs = [
  { status: MeetingStatus.active, label: msg`Active` },
  { status: MeetingStatus.archived, label: msg`Archived` },
] as const;

export function MeetingsTabs() {
  const { i18n } = useLingui();

  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-1 whitespace-nowrap">
      {tabs.map(({ status, label }) => (
        <Link
          key={status}
          to="/when2meet"
          search={{ status }}
          className="px-3 py-2.5"
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{ className: "border-b-2 border-b-primary" }}
        >
          {i18n._(label)}
        </Link>
      ))}
    </div>
  );
}
