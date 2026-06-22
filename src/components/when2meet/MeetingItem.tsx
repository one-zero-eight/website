import type { when2meetTypes } from "@/api/when2meet";
import { Link } from "@tanstack/react-router";

export function MeetingItem({
  meeting,
}: {
  meeting: when2meetTypes.SchemaEventSummary;
}) {
  return (
    <Link
      to="/when2meet/$meetingId"
      params={{ meetingId: meeting.slug }}
      className="card card-border bg-base-200 hover:border-primary/30 flex h-full cursor-pointer flex-col transition"
    >
      <div className="card-body flex grow flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{meeting.name}</h3>
          {meeting.description && (
            <p className="text-base-content/70 line-clamp-2 text-sm">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="text-base-content/70 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {meeting.date_range_label && (
            <div className="flex items-center gap-2">
              <span className="icon-[mdi--calendar-outline] text-primary shrink-0 text-lg" />
              <span>{meeting.date_range_label}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="icon-[mdi--account-group-outline] text-primary shrink-0 text-lg" />
            <span>{meeting.participantsCount ?? 0} participants</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
