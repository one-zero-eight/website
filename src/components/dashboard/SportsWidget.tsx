import { useMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { $sport } from "@/api/sport";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { ActivitySchedule } from "./ActivitySchedule.tsx";
import { getUpcomingActivities } from "./activities.ts";
import {
  getSportCalendarRange,
  normalizeSportActivities,
} from "./sport-activities.ts";

export function SportsWidget() {
  const [sportToken] = useMySportAccessToken();
  const profileQuery = $sport.useQuery(
    "get",
    "/users/me",
    {},
    { enabled: !!sportToken },
  );
  const profile = profileQuery.data;
  const hoursQuery = $sport.useQuery(
    "get",
    "/students/{student_id}/hours-summary",
    { params: { path: { student_id: Number(profile?.user_id) } } },
    { enabled: !!profile && !!sportToken },
  );
  const semesterQuery = $sport.useQuery(
    "get",
    "/semesters/current",
    {},
    { enabled: !!profile && !!sportToken },
  );
  const nowMs = useNowMS(!!sportToken);
  const range = getSportCalendarRange(nowMs);
  const trainingsQuery = $sport.useQuery(
    "get",
    "/users/me/schedule",
    { params: { query: range } },
    {
      enabled: !!profile && !!sportToken,
      select: normalizeSportActivities,
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  );

  if (!sportToken) return null;

  const hours = hoursQuery.data;
  const earnedHours = hours
    ? hours.hours_from_groups + hours.self_sport_hours
    : undefined;
  const currentSemester = semesterQuery.data;
  const deadline = currentSemester?.end
    ? new Date(currentSemester.end)
    : undefined;
  const hasDeadline = deadline && Number.isFinite(deadline.getTime());
  const daysLeft = hasDeadline
    ? Math.max(0, Math.ceil((deadline.getTime() - nowMs) / 86_400_000))
    : undefined;
  const upcoming = getUpcomingActivities(trainingsQuery.data ?? [], nowMs, 3);

  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="icon-[material-symbols--exercise-outline] text-primary size-8 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Sports</h2>
          <p className="text-base-content/60 text-sm">
            Your check-ins · Next 7 days
          </p>
        </div>
      </div>
      {profileQuery.isError ? (
        <div className="text-error flex flex-wrap items-center gap-2 text-sm">
          <span>Could not load your sport profile.</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void profileQuery.refetch()}
            disabled={profileQuery.isFetching}
          >
            {profileQuery.isFetching ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Retry"
            )}
          </button>
        </div>
      ) : (
        <>
          <ActivitySchedule
            activities={upcoming}
            nowMs={nowMs}
            isPending={profileQuery.isPending || trainingsQuery.isPending}
            isError={trainingsQuery.isError}
            onRetry={() => trainingsQuery.refetch()}
            emptyMessage="No upcoming check-ins in the next 7 days"
            showDates
          />
          <div className="border-base-content/10 flex flex-col gap-1 border-t pt-3 text-sm">
            {hoursQuery.isError || semesterQuery.isError ? (
              <div className="text-error flex flex-wrap items-center gap-2">
                <span>Sport hours or deadline could not be loaded.</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={hoursQuery.isFetching || semesterQuery.isFetching}
                  onClick={() =>
                    void Promise.all([
                      hoursQuery.refetch(),
                      semesterQuery.refetch(),
                    ])
                  }
                >
                  {hoursQuery.isFetching || semesterQuery.isFetching ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    "Retry"
                  )}
                </button>
              </div>
            ) : hoursQuery.isPending || semesterQuery.isPending ? (
              <>
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-4 w-3/4" />
              </>
            ) : (
              <>
                {hours && (
                  <p>
                    <span className="font-semibold">
                      {earnedHours} / {hours.required_hours}
                      {hours.debt ? ` +${hours.debt} (debt)` : ""}
                    </span>{" "}
                    hours
                  </p>
                )}
                <p className="text-base-content/70">
                  {hasDeadline ? (
                    <>
                      Deadline:{" "}
                      {deadline.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      ({daysLeft} days left)
                    </>
                  ) : (
                    "Semester deadline unavailable"
                  )}
                </p>
              </>
            )}
          </div>
        </>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1 text-sm">
        <a
          href="https://sport.innopolis.university/profile/"
          className="text-primary flex w-fit items-center gap-1 font-medium hover:underline"
        >
          Go to official site
          <span className="icon-[material-symbols--open-in-new-rounded] text-sm" />
        </a>
        <a
          href="https://telegram.me/IUSportBot"
          className="text-base-content/70 w-fit hover:underline"
        >
          Check in via <span className="text-primary">Sports bot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </section>
  );
}
