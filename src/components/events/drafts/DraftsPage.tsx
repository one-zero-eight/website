import {
  formatApiErrorDescriptor,
  formatApiErrorMessage,
} from "@/api/helpers/create-query-client";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { $events } from "@/api/events";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventsByDate } from "../shared/EventsByDate";
import { EventSummaryCard } from "../shared/EventSummaryCard";
import { getDraftImageUrl } from "../utils/links";
import { CreateDraftModal } from "./CreateDraftModal";

export function DraftsPage() {
  useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const { canManage, clubs, isPending: isAuthPending } = useEventsAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = $events.useQuery(
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
      queryKey: $events.queryOptions("get", "/drafts/").queryKey,
    });
  };

  const { mutate: acceptInvite, isPending: isAccepting } = $events.useMutation(
    "post",
    "/drafts/{id}/accept",
    {
      onSuccess: () => {
        setPendingId(null);
        invalidateList();
      },
      onError: (mutationError) => {
        setPendingId(null);
        showError(msg`Error`, formatApiErrorDescriptor(mutationError));
      },
    },
  );

  const { mutate: declineInvite, isPending: isDeclining } = $events.useMutation(
    "post",
    "/drafts/{id}/decline",
    {
      onSuccess: () => {
        setPendingId(null);
        invalidateList();
      },
      onError: (mutationError) => {
        setPendingId(null);
        showError(msg`Error`, formatApiErrorDescriptor(mutationError));
      },
    },
  );

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
          <Trans>Retry</Trans>
        </button>
      </div>
    );
  }

  return (
    <div className="@container/content px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-medium">
          <Trans>Your drafts</Trans>
        </h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          <Trans>Create draft</Trans>
        </button>
      </div>

      {data && data.length === 0 ? (
        <p className="text-base-content/70">
          <Trans>No drafts yet.</Trans>
        </p>
      ) : (
        <EventsByDate
          events={data ?? []}
          getStartsAt={(draft) => draft.data.starts_at}
          renderCard={(draft) => {
            const inviteBusy =
              pendingId === draft.id && (isAccepting || isDeclining);

            return (
              <EventSummaryCard
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
                        <Trans>Decline</Trans>
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
                        <Trans>Accept</Trans>
                      </button>
                    </div>
                  ) : undefined
                }
              />
            );
          }}
        />
      )}

      <CreateDraftModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
