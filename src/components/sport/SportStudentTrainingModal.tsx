import { $clubs } from "@/api/clubs";
import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import {
  canShowCheckInButton,
  getCheckInUnavailableReason,
  invalidateSportCheckinQueries,
} from "@/components/sport/sport-checkin-utils.ts";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import {
  formatTimeRangeMoscow,
  moscowDateKey,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function SportStudentTrainingModal({
  open,
  onOpenChange,
  onCheckinSuccess,
  row,
  studentId,
  trainerGroupIds,
  onAttendance,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckinSuccess: () => void;
  row: SchemaTrainingInfoPersonalSchema;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
  onAttendance?: () => void;
  readOnly?: boolean;
}) {
  const [checkinFeedback, setCheckinFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  useEffect(() => {
    if (!checkinFeedback || checkinFeedback.isError) return;

    const timeout = setTimeout(() => setCheckinFeedback(null), 2500);
    return () => clearTimeout(timeout);
  }, [checkinFeedback]);

  const {
    data: profile,
    isPending: profilePending,
    isError: profileError,
  } = $sport.useQuery("get", "/users/me");

  const { mutate: setCheckin, isPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSuccess: (_, vars) => {
        invalidateSportCheckinQueries(studentId);
        if (!vars.params.query.checkin) {
          onOpenChange(false);
          return;
        }

        onOpenChange(false);
        onCheckinSuccess();
      },
      onError: (_error, vars) => {
        setCheckinFeedback({
          message: vars.params.query.checkin
            ? "Check-in failed · Retry"
            : "Check-out failed · Retry",
          isError: true,
        });
      },
    },
  );

  const { data: clubs, isError: clubsError } = $clubs.useQuery(
    "get",
    "/clubs/",
  );
  const club = clubs?.findLast(
    (club) =>
      club.is_active &&
      club.sport_id != null &&
      row.training.sport_id != null &&
      club.sport_id === String(row.training.sport_id),
  );

  const inlineDescription = getTrainingDescription(row);
  const groupId = row.training.group_id;
  const {
    data: group,
    isPending: groupPending,
    isError: groupError,
  } = $sport.useQuery(
    "get",
    "/sport-groups/{group_id}",
    { params: { path: { group_id: Number(groupId) } } },
    { enabled: groupId != null },
  );

  const training = row.training;
  const trainingDay = moscowDateKey(training.start);
  const dailyStart = new Date(`${trainingDay}T00:00:00+03:00`);
  const dailyEnd = new Date(dailyStart.getTime() + 24 * 60 * 60 * 1000);
  const hasEnded = new Date(training.end).getTime() <= Date.now();
  const needsDailySchedule =
    !readOnly && !row.checked_in && !row.can_check_in && !hasEnded;
  const {
    data: dailySchedule,
    isPending: dailySchedulePending,
    isError: dailyScheduleError,
  } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: toScheduleApiDateTime(dailyStart),
          end: toScheduleApiDateTime(dailyEnd),
        },
      },
    },
    { enabled: needsDailySchedule },
  );
  const {
    data: semesters,
    isPending: historyPending,
    isError: historyError,
  } = $sport.useQuery(
    "get",
    "/students/{student_id}/semester-history",
    { params: { path: { student_id: studentId } } },
    { enabled: hasEnded },
  );
  const earnedHours = semesters
    ?.flatMap((semester) => semester.trainings)
    .find((entry) => entry.training_id === training.id)?.hours;
  const title = sportTrainingTitle(row);
  const when = new Date(training.start);
  const moscowYear = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
  const dateStr = when.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    ...(moscowYear.format(when) === moscowYear.format(new Date())
      ? {}
      : { year: "numeric" as const }),
    timeZone: "Europe/Moscow",
  });
  const weekdayStr = when.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Europe/Moscow",
  });
  const timeStr = formatTimeRangeMoscow(training.start, training.end);
  const placesFree = Math.max(
    0,
    training.max_checkins - training.checkins_count,
  );
  const isFull = training.checkins_count >= training.max_checkins;
  const description = inlineDescription || group?.sport_description?.trim();
  const canShowCheckIn = canShowCheckInButton(
    row,
    row.checked_in,
    trainerGroupIds,
  );
  const isTrainer = trainerGroupIds.has(training.group_id);
  const unavailableReason = getCheckInUnavailableReason(
    row,
    group,
    profile?.student_info,
    dailySchedule,
  );
  const isCheckingDailyLimit = needsDailySchedule && dailySchedulePending;
  const showUnavailableReason =
    unavailableReason !== "Check-in is not available for this training." ||
    !isCheckingDailyLimit;

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeDisabled={isPending}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-base-content/60 font-semibold">Time & date</dt>
            <dd>
              {timeStr}, {dateStr}, {weekdayStr}
            </dd>
          </div>
          <div>
            <dt className="text-base-content/60 font-semibold">Places</dt>
            <dd>
              {placesFree} / {training.max_checkins} free
              {isFull ? " (no places left)" : ""}
            </dd>
          </div>
          {!readOnly &&
          !canShowCheckIn &&
          !row.checked_in &&
          !isTrainer &&
          (groupPending ||
            profilePending ||
            (needsDailySchedule && dailySchedulePending)) ? (
            <div className="skeleton h-10 w-full" />
          ) : null}
          {!readOnly &&
          (groupError ||
            profileError ||
            (needsDailySchedule && dailyScheduleError)) &&
          !canShowCheckIn &&
          !row.checked_in &&
          !isTrainer ? (
            <div className="text-error">
              Training eligibility could not be fully loaded.
            </div>
          ) : null}
          {!readOnly && !canShowCheckIn && !isTrainer && row.checked_in ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Cannot check out
              </dt>
              <dd className="text-error">
                This training has already {hasEnded ? "ended" : "started"}.
              </dd>
            </div>
          ) : !readOnly &&
            !canShowCheckIn &&
            !isTrainer &&
            unavailableReason &&
            showUnavailableReason ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Cannot check in
              </dt>
              <dd className="text-error">{unavailableReason}</dd>
            </div>
          ) : null}
          {training.training_location ? (
            <div>
              <dt className="text-base-content/60 font-semibold">Location</dt>
              <dd>
                <Link
                  to="/maps"
                  search={{ q: training.training_location.name }}
                  className="underline underline-offset-2"
                >
                  {training.training_location.name}
                </Link>
              </dd>
            </div>
          ) : null}
          {hasEnded && historyPending ? (
            <div className="skeleton h-10 w-full" />
          ) : hasEnded && historyError ? (
            <div className="text-error">
              Earned sport hours could not be loaded.
            </div>
          ) : earnedHours != null && earnedHours > 0 ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Sport hours earned
              </dt>
              <dd>
                <span className="badge badge-success badge-sm">
                  {earnedHours}h
                </span>
              </dd>
            </div>
          ) : null}
          {club ? (
            <div>
              <dt className="text-base-content/60 font-semibold">Club</dt>
              <dd>
                <Link
                  to="/clubs/$slug"
                  params={{ slug: club.slug }}
                  className="link link-hover inline-flex items-center gap-2"
                >
                  <ClubLogo
                    clubId={club.id}
                    logoFileId={club.logo_file_id}
                    className="size-8"
                  />
                  <span>{club.title}</span>
                </Link>
              </dd>
            </div>
          ) : clubsError ? (
            <div className="text-error">Club could not be loaded.</div>
          ) : null}
          {groupPending && !description ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Description
              </dt>
              <dd className="skeleton h-12 w-full" />
            </div>
          ) : groupError && !description ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Description
              </dt>
              <dd className="text-error">Description could not be loaded.</dd>
            </div>
          ) : description ? (
            <div>
              <dt className="text-base-content/60 font-semibold">
                Description
              </dt>
              <dd
                className="prose prose-sm text-base-content max-w-none"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          ) : null}
        </dl>
      </div>

      <div className="border-t-base-300 flex shrink-0 flex-wrap gap-2 border-t p-4">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
        {isTrainer && onAttendance ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAttendance}
          >
            To attendance
          </button>
        ) : null}
        {!readOnly && canShowCheckIn ? (
          row.checked_in ? (
            <button
              type="button"
              className={cn(
                "btn",
                checkinFeedback
                  ? checkinFeedback.isError
                    ? "btn-error"
                    : "btn-success disabled:bg-success! disabled:text-success-content! disabled:opacity-100!"
                  : "btn-error btn-outline",
              )}
              disabled={
                isPending ||
                (checkinFeedback !== null && !checkinFeedback.isError)
              }
              title={
                checkinFeedback?.isError ? checkinFeedback.message : undefined
              }
              onClick={() => {
                setCheckinFeedback(null);
                setCheckin({
                  params: {
                    path: { training_id: training.id },
                    query: { checkin: false },
                  },
                });
              }}
            >
              <span className="grid place-items-center">
                <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                  Check out
                </span>
                <span className="col-start-1 row-start-1">
                  {isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : checkinFeedback ? (
                    checkinFeedback.isError ? (
                      "Retry"
                    ) : (
                      <span className="icon-[material-symbols--check] text-xl" />
                    )
                  ) : (
                    "Check out"
                  )}
                </span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "btn",
                checkinFeedback
                  ? checkinFeedback.isError
                    ? "btn-error"
                    : "btn-success disabled:bg-success! disabled:text-success-content! disabled:opacity-100!"
                  : "btn-primary",
              )}
              disabled={
                isPending ||
                (checkinFeedback !== null && !checkinFeedback.isError)
              }
              title={
                checkinFeedback?.isError ? checkinFeedback.message : undefined
              }
              onClick={() => {
                setCheckinFeedback(null);
                setCheckin({
                  params: {
                    path: { training_id: training.id },
                    query: { checkin: true },
                  },
                });
              }}
            >
              <span className="grid place-items-center">
                <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                  Check out
                </span>
                <span className="col-start-1 row-start-1">
                  {isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : checkinFeedback ? (
                    checkinFeedback.isError ? (
                      "Retry"
                    ) : (
                      <span className="icon-[material-symbols--check] text-xl" />
                    )
                  ) : (
                    "Check in"
                  )}
                </span>
              </span>
            </button>
          )
        ) : null}
      </div>
    </SportTrainingModalShell>
  );
}

function getTrainingDescription(
  row: SchemaTrainingInfoPersonalSchema,
): string | null {
  const training =
    row.training as SchemaTrainingInfoPersonalSchema["training"] & {
      description?: string | null;
      sport_description?: string | null;
      training_description?: string | null;
    };
  const description =
    training.description ??
    training.training_description ??
    training.sport_description;

  return description?.trim() || null;
}
