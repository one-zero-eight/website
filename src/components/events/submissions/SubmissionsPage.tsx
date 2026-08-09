import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { ModerationStatus } from "@/api/workshops/types";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useEventsAuth } from "../hooks";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getSubmissionImageUrl } from "../utils/links";

export function SubmissionsPage() {
  const navigate = useNavigate();
  const { isModerator, clubs, isPending: isAuthPending } = useEventsAuth();

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/submissions/",
    {
      params: {
        query: { status: ModerationStatus.pending },
      },
    },
    { enabled: isModerator },
  );

  useEffect(() => {
    if (!isAuthPending && !isModerator) {
      navigate({ to: "/events" });
    }
  }, [isModerator, isAuthPending, navigate]);

  if (isAuthPending || isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 py-4 @min-[700px]/content:grid-cols-2">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!isModerator) {
    return null;
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
      <h2 className="mb-4 text-2xl font-medium">Submissions</h2>

      {data && data.length === 0 ? (
        <p className="text-base-content/70">No pending submissions.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 @min-[700px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-3">
          {data?.map((item) => (
            <EventSummaryCard
              key={item.id}
              href={`/events/submissions/${item.id}`}
              imageUrl={
                item.submission.data.image_id
                  ? getSubmissionImageUrl(item.id)
                  : null
              }
              name={item.submission.data.name}
              host={item.submission.data.host}
              clubs={clubs}
              startsAt={item.submission.data.starts_at}
              location={item.submission.data.location}
              hostPrefix="By "
            />
          ))}
        </div>
      )}
    </div>
  );
}
