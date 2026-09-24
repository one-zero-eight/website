import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import {
  ModerationStatus,
  SchemaSubmissionListItem,
} from "@/api/workshops/types";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useEventsAuth } from "../hooks";
import { EventsByDate } from "../shared/EventsByDate";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getSubmissionImageUrl } from "../utils/links";

const sections: {
  status: ModerationStatus;
  title: string;
  empty: string;
}[] = [
  {
    status: ModerationStatus.pending,
    title: "Pending",
    empty: "No pending submissions.",
  },
  {
    status: ModerationStatus.declined,
    title: "Declined",
    empty: "No declined submissions.",
  },
  {
    status: ModerationStatus.approved,
    title: "Approved",
    empty: "No approved submissions.",
  },
];

export function SubmissionsPage() {
  const navigate = useNavigate();
  const { isModerator, clubs, isPending: isAuthPending } = useEventsAuth();

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/submissions/",
    undefined,
    { enabled: isModerator },
  );

  const byStatus = useMemo(() => {
    const groups: Record<ModerationStatus, SchemaSubmissionListItem[]> = {
      [ModerationStatus.pending]: [],
      [ModerationStatus.declined]: [],
      [ModerationStatus.approved]: [],
    };

    for (const item of data ?? []) {
      const status = item.submission.moderation.status;
      groups[status]?.push(item);
    }

    return groups;
  }, [data]);

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
    <div className="@container/content flex flex-col gap-3 px-4 py-4">
      <h2 className="text-2xl font-medium">Submissions</h2>

      {sections.map((section) => {
        const items = byStatus[section.status];

        return (
          <section key={section.status}>
            <details className="collapse-arrow collapse" open>
              <summary className="collapse-title flex items-center gap-2 py-1.5 pr-6 pl-0 text-xl font-medium after:end-3">
                {section.title}
                <span className="badge badge-ghost">{items.length}</span>
              </summary>
              <div className="collapse-content px-0 py-1.5">
                {items.length === 0 ? (
                  <p className="text-base-content/70">{section.empty}</p>
                ) : (
                  <EventsByDate
                    events={items}
                    getStartsAt={(item) => item.submission.data.starts_at}
                    renderCard={(item) => (
                      <EventSummaryCard
                        href={`/events/submissions/${item.id}`}
                        imageUrl={
                          item.submission.data.image_id
                            ? getSubmissionImageUrl(item.id)
                            : null
                        }
                        name={item.submission.data.name}
                        hosts={item.submission.data.hosts}
                        clubs={clubs}
                        startsAt={item.submission.data.starts_at}
                        location={item.submission.data.location}
                        status={
                          item.status ?? item.submission.moderation.status
                        }
                      />
                    )}
                  />
                )}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
