import { $workshops } from "@/api/workshops";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { SchemaWorkshop } from "@/api/workshops/types";
import { useToast } from "@/components/toast";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useEventsAuth } from "./hooks";
import {
  eventName,
  formatDate,
  formatTime,
  getDate,
  isEventPendingApproval,
  parseTime,
} from "./utils";

export function EventsApprovalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showConfirm } = useToast();
  const { isAdmin } = useEventsAuth();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const {
    data: events,
    isPending,
    isError,
    error,
  } = $workshops.useQuery("get", "/workshops/");

  useEffect(() => {
    if (!isAdmin) {
      navigate({ to: "/events" });
    }
  }, [isAdmin, navigate]);

  const pendingEvents = useMemo(() => {
    return (events ?? [])
      .filter(isEventPendingApproval)
      .sort(
        (a, b) =>
          new Date(a.dtstart || "").getTime() -
          new Date(b.dtstart || "").getTime(),
      );
  }, [events]);

  const invalidateEvents = () => {
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
    });
  };

  const { mutate: approveEvent } = $workshops.useMutation(
    "post",
    "/workshops/{workshop_id}/approve",
    {
      onSettled: () => {
        setPendingActionId(null);
        invalidateEvents();
      },
    },
  );

  const { mutate: denyEvent } = $workshops.useMutation(
    "delete",
    "/workshops/{workshop_id}",
    {
      onSettled: () => {
        setPendingActionId(null);
        invalidateEvents();
      },
    },
  );

  const handleApprove = (event: SchemaWorkshop) => {
    setPendingActionId(event.id);
    approveEvent(
      { params: { path: { workshop_id: event.id } } },
      {
        onSuccess: () => {
          showSuccess(
            "Event approved",
            `"${eventName(event)}" is now visible in the list.`,
          );
        },
        onError: (approveError) => {
          showError("Approval failed", formatApiErrorMessage(approveError));
        },
      },
    );
  };

  const handleDeny = async (event: SchemaWorkshop) => {
    const confirmed = await showConfirm({
      title: "Deny event",
      message: `Deny "${eventName(event)}"? This will permanently delete the event.`,
      confirmText: "Deny",
      cancelText: "Cancel",
      type: "error",
    });

    if (!confirmed) {
      return;
    }

    setPendingActionId(event.id);
    denyEvent(
      { params: { path: { workshop_id: event.id } } },
      {
        onSuccess: () => {
          showSuccess(
            "Event denied",
            `"${eventName(event)}" has been deleted.`,
          );
        },
        onError: (denyError) => {
          showError("Deny failed", formatApiErrorMessage(denyError));
        },
      },
    );
  };

  if (!isAdmin) {
    return null;
  }

  if (isPending) {
    return (
      <div className="px-4 py-8">
        <div className="skeleton h-8 w-64" />
        <div className="mt-4 grid gap-4">
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-error">{formatApiErrorMessage(error)}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="text-base-content/70 mb-4">
        Review submitted events before they appear in the public list.
      </p>

      {pendingEvents.length === 0 ? (
        <div className="card card-border">
          <div className="card-body items-center py-12 text-center">
            <span className="icon-[material-symbols--task-alt] text-primary text-5xl" />
            <h2 className="text-xl font-semibold">
              No events pending approval
            </h2>
            <p className="text-base-content/70">
              New submissions from club leaders will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingEvents.map((event) => {
            const isActionPending = pendingActionId === event.id;
            const startDate = event.dtstart ? getDate(event.dtstart) : "";
            const startTime = formatTime(parseTime(event.dtstart || ""));

            return (
              <div key={event.id} className="card card-border bg-base-100">
                <div className="card-body gap-4">
                  <div className="flex flex-col gap-2 @lg/content:flex-row @lg/content:items-start @lg/content:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {eventName(event)}
                      </h2>
                      {event.dtstart && (
                        <p className="text-base-content/70 mt-1">
                          {formatDate(startDate)} · {startTime}
                          {event.place ? ` · ${event.place}` : ""}
                        </p>
                      )}
                    </div>
                    <Link
                      to="/events/$id"
                      params={{ id: event.id }}
                      className="btn btn-ghost btn-sm w-fit"
                    >
                      View event
                      <span className="icon-[lucide--move-right]" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-error btn-outline"
                      disabled={isActionPending}
                      onClick={() => handleDeny(event)}
                    >
                      {isActionPending ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <span className="icon-[material-symbols--close-rounded]" />
                      )}
                      Deny
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isActionPending}
                      onClick={() => handleApprove(event)}
                    >
                      {isActionPending ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <span className="icon-[material-symbols--check-rounded]" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
