import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getDraftImageUrl } from "../utils/links";
import { CreateDraftModal } from "./CreateDraftModal";

export function DraftsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const { canManage, clubs, isPending: isAuthPending } = useEventsAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/drafts/",
    undefined,
    { enabled: canManage },
  );

  useEffect(() => {
    if (!isAuthPending && !canManage) {
      navigate({ to: "/events" });
    }
  }, [canManage, isAuthPending, navigate]);

  const invalidateList = () => {
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/drafts/").queryKey,
    });
  };

  const { mutate: acceptInvite, isPending: isAccepting } =
    $workshops.useMutation("post", "/drafts/{id}/accept", {
      onSuccess: () => {
        setPendingId(null);
        invalidateList();
      },
      onError: (mutationError) => {
        setPendingId(null);
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: declineInvite, isPending: isDeclining } =
    $workshops.useMutation("post", "/drafts/{id}/decline", {
      onSuccess: () => {
        setPendingId(null);
        invalidateList();
      },
      onError: (mutationError) => {
        setPendingId(null);
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

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
          {data?.map((draft) => {
            const inviteBusy =
              pendingId === draft.id && (isAccepting || isDeclining);

            return (
              <EventSummaryCard
                key={draft.id}
                href={`/events/drafts/${draft.id}`}
                imageUrl={
                  draft.data.image_id ? getDraftImageUrl(draft.id) : null
                }
                name={draft.data.name}
                hosts={draft.data.hosts}
                clubs={clubs}
                startsAt={draft.data.starts_at}
                location={draft.data.location}
                status={draft.status}
                invitedBy={draft.invited_by}
                footer={
                  draft.invited_by ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={inviteBusy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingId(draft.id);
                          declineInvite({
                            params: { path: { id: draft.id } },
                          });
                        }}
                      >
                        {inviteBusy && isDeclining && (
                          <span className="loading loading-spinner loading-sm" />
                        )}
                        Decline
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={inviteBusy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingId(draft.id);
                          acceptInvite({
                            params: { path: { id: draft.id } },
                          });
                        }}
                      >
                        {inviteBusy && isAccepting && (
                          <span className="loading loading-spinner loading-sm" />
                        )}
                        Accept
                      </button>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      <CreateDraftModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
