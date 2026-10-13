import { cn } from "@/lib/ui/cn";
import { useState } from "react";
import {
  type DashboardActivity,
  formatActivityTime,
  formatScheduleDayHeader,
} from "./activities.ts";

/** Shared presentation only: each widget owns its data and visible time range. */
export function ActivitySchedule({
  activities,
  nowMs,
  isPending,
  isError = false,
  onRetry,
}: {
  activities: DashboardActivity[];
  nowMs: number;
  isPending: boolean;
  isError?: boolean;
  onRetry?: () => Promise<unknown>;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const activityGroups = new Map<string, DashboardActivity[]>();
  for (const activity of [...activities].sort(
    (left, right) => left.start.getTime() - right.start.getTime(),
  )) {
    const day = activity.start.toDateString();
    const group = activityGroups.get(day) ?? [];
    group.push(activity);
    activityGroups.set(day, group);
  }

  async function handleRetry() {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }

  if (!isPending && !isError && activities.length === 0) return null;

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
      {isPending && activities.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-32" />
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2 py-1">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        [...activityGroups].map(([day, group], groupIndex) => (
          <div
            key={day}
            className={cn(
              "flex min-w-0 flex-col gap-2",
              groupIndex > 0 && "pt-1",
            )}
          >
            <p className="text-base-content/60 border-base-content/20 border-b pb-2 text-sm">
              {formatScheduleDayHeader(group[0].start, nowMs)}
            </p>
            <ul className="flex min-w-0 flex-col gap-3">
              {group.map((activity) => {
                const inProgress =
                  activity.start.getTime() <= nowMs &&
                  activity.end.getTime() > nowMs;
                return (
                  <li key={activity.id}>
                    <div
                      className={cn(
                        "flex min-w-0 flex-col gap-0.5 border-l-2 pl-3",
                        inProgress ? "border-error" : "border-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "text-base font-semibold tabular-nums",
                          inProgress && "text-error",
                        )}
                      >
                        {formatActivityTime(activity)}
                      </span>
                      <span className="text-base-content/60 min-w-0 text-sm wrap-anywhere">
                        {activity.title}
                      </span>
                      {activity.location && (
                        <span className="text-base-content/60 min-w-0 text-sm wrap-anywhere">
                          {activity.location}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
