import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import moment from "moment";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getEventImageUrl } from "../utils/links";

/**
 * Custom calendar view that renders published events as cards (same look as
 * drafts/submissions), fetched from the events API instead of the .ics feed.
 */
export function EventsCardsView({ date }: { date: Date }) {
  const from = moment(date).startOf("month").toISOString();
  const to = moment(date).add(1, "month").startOf("month").toISOString();

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/events/",
    { params: { query: { from, to } } },
  );

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 py-4 @min-[700px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-3 @min-[1400px]/content:grid-cols-4">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-4">
        <p className="text-error mb-2">{formatApiErrorMessage(error)}</p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="@container/content px-4 py-4">
      {data && data.length === 0 ? (
        <p className="text-base-content/70">No events this month.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 @min-[700px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-3 @min-[1400px]/content:grid-cols-4">
          {data?.map((event) => (
            <EventSummaryCard
              key={event.id}
              href={`/events/p/${event.id}`}
              imageUrl={event.data.image_id ? getEventImageUrl(event.id) : null}
              name={event.data.name}
              publicHosts={event.data.hosts}
              startsAt={event.data.starts_at}
              location={event.data.location}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
