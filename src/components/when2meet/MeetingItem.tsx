import type { when2meetTypes } from "@/api/when2meet";
import { Link } from "@tanstack/react-router";
import { formatMeetingTimeRange } from "./utils/meeting-time.ts";

export function MeetingItem({
  meeting,
}: {
  meeting: when2meetTypes.SchemaEventSummary;
}) {
  const selectedTimeLabel = formatMeetingTimeRange(meeting.selected_time);

  return (
    <Link
      to="/when2meet/$meetingId"
      params={{ meetingId: meeting.slug }}
      className="card card-border bg-base-200 hover:border-primary/30 flex h-full cursor-pointer flex-col transition"
    >
      <div className="card-body flex grow flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 text-lg font-semibold">{meeting.name}</h3>
            {meeting.is_archived && (
              <span
                className="icon-[mdi--archive-outline] text-base-content/60 shrink-0 text-lg"
                title="Archived"
              />
            )}
          </div>
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
            <span>{meeting.participants_count}</span>
          </div>
          {selectedTimeLabel ? (
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--schedule-outline] text-secondary shrink-0 text-lg" />
              <span>{selectedTimeLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--schedule-outline] text-base-content/50 shrink-0 text-lg" />
              <span>Not selected</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
