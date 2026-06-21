import { Link } from "@tanstack/react-router";
import { formatDateRangeLabel, formatMeetingDates } from "./utils/slots.ts";

export function EventDetailsPage({
  meetingId,
  meetingName,
  meetingDates,
  description,
}: {
  meetingId: string;
  meetingName: string;
  meetingDates: string[];
  description?: string | null;
}) {
  const formattedDates = formatMeetingDates(meetingDates);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <Link
        to="/when2meet/$meetingId"
        params={{ meetingId }}
        search={{ name: meetingName }}
        className="text-base-content/70 hover:text-base-content mb-4 inline-flex items-center gap-1 text-sm"
      >
        <span className="icon-[material-symbols--arrow-back]" />
        Back to meeting
      </Link>

      <h1 className="mb-6 text-xl font-semibold">Event details</h1>

      <div className="bg-base-100 border-base-300 rounded-box grid gap-4 border p-4 text-sm">
        <div>
          <div className="text-base-content/60">Name</div>
          <div className="font-medium">{meetingName}</div>
        </div>
        {description && (
          <div>
            <div className="text-base-content/60">Description</div>
            <div>{description}</div>
          </div>
        )}
        <div>
          <div className="text-base-content/60">Dates</div>
          <div>{formatDateRangeLabel(formattedDates)}</div>
        </div>
        <p className="text-base-content/60">
          Event settings cannot be changed after creation yet.
        </p>
      </div>
    </div>
  );
}
