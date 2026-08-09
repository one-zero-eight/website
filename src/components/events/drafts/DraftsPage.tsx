import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getDraftImageUrl } from "../utils/links";
import { CreateDraftModal } from "./CreateDraftModal";

export function DraftsPage() {
  const navigate = useNavigate();
  const { canManage, isPending: isAuthPending } = useEventsAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/drafts/",
    undefined,
    { enabled: canManage },
  );
  const { clubs } = useEventsAuth();

  useEffect(() => {
    if (!isAuthPending && !canManage) {
      navigate({ to: "/events" });
    }
  }, [canManage, isAuthPending, navigate]);

  if (isAuthPending || isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 py-4 @min-[700px]/content:grid-cols-2">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!canManage) {
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-medium">Your drafts</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          Create draft
        </button>
      </div>

      {data && data.length === 0 ? (
        <p className="text-base-content/70">No drafts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 @min-[700px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-3">
          {data?.map((draft) => (
            <EventSummaryCard
              key={draft.id}
              href={`/events/drafts/${draft.id}`}
              imageUrl={draft.data.image_id ? getDraftImageUrl(draft.id) : null}
              name={draft.data.name}
              host={draft.data.host}
              clubs={clubs}
              startsAt={draft.data.starts_at}
              location={draft.data.location}
              status={draft.status}
            />
          ))}
        </div>
      )}

      <CreateDraftModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
