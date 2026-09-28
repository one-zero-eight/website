import { cn } from "@/lib/ui/cn";
import { useState } from "react";
import {
  type DashboardActivity,
  formatActivityTime,
  getActivityStatus,
} from "./activities.ts";

/** Shared presentation only: each widget owns its data and visible time range. */
export function ActivitySchedule({
  activities,
  nowMs,
  isPending,
  isError,
  onRetry,
  emptyMessage,
  showDates = false,
}: {
  activities: DashboardActivity[];
  nowMs: number;
  isPending: boolean;
  isError: boolean;
  onRetry: () => Promise<unknown>;
  emptyMessage: string;
  showDates?: boolean;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const nextActivity = activities[0];

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {isError && (
        <div className="bg-error/10 text-error rounded-field flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <span>Some activities could not be loaded.</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void handleRetry()}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Retry"
            )}
          </button>
        </div>
      )}
      {isPending ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-32" />
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2 py-1">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : nextActivity ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "badge badge-soft h-auto py-1 text-xs font-medium",
                nextActivity.start.getTime() <= nowMs
                  ? "badge-success"
                  : "badge-primary",
              )}
            >
              {getActivityStatus(nextActivity, nowMs)}
            </span>
            {isError && (
              <span className="text-base-content/60 text-xs">
                Schedule may be incomplete
              </span>
            )}
          </div>
          <ul className="divide-base-content/10 flex min-w-0 flex-col divide-y">
            {activities.map((activity) => {
              const inProgress = activity.start.getTime() <= nowMs;
              return (
                <li
                  key={activity.id}
                  className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      inProgress ? "bg-success" : "bg-primary/50",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium wrap-anywhere">
                      {activity.title}
                    </p>
                    <p className="text-base-content/70 mt-0.5 text-sm tabular-nums">
                      {showDates &&
                        `${activity.start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, `}
                      {formatActivityTime(activity)}
                    </p>
                    {activity.location && (
                      <p className="text-base-content/60 mt-0.5 text-xs wrap-anywhere">
                        {activity.location}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : !isError ? (
        <p className="text-base-content/60 py-3 text-sm">{emptyMessage}</p>
      ) : null}
    </div>
  );
}
