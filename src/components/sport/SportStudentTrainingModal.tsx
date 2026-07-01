import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { canShowCheckInButton } from "@/components/sport/sport-checkin-utils.ts";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { formatTimeRangeMoscow } from "@/components/sport/sport-week-utils.ts";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

function invalidateSportSchedule(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "sport" &&
      q.queryKey[2] === "/users/me/schedule",
  });
}

function invalidateStudentHours(
  client: ReturnType<typeof useQueryClient>,
  studentId: number,
) {
  client.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/students/{student_id}/hours-summary",
      { params: { path: { student_id: studentId } } },
    ).queryKey,
  });
}

export function SportStudentTrainingModal({
  open,
  onOpenChange,
  row,
  studentId,
  trainerGroupIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemaTrainingInfoPersonalSchema;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const { mutate: setCheckin, isPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSettled: () => {
        invalidateSportSchedule(queryClient);
        invalidateStudentHours(queryClient, studentId);
      },
      onSuccess: (_, vars) => {
        const checkin = vars.params.query.checkin;
        showSuccess(
          checkin ? "Checked in" : "Check-in cancelled",
          checkin
            ? "You are signed up for this training."
            : "You are no longer signed up.",
        );
        onOpenChange(false);
      },
      onError: () => {
        showError(
          "Could not update check-in",
          "Please try again or use the Telegram bot.",
        );
      },
    },
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
    { enabled: groupId != null && !inlineDescription },
  );

  const training = row.training;
  const title = sportTrainingTitle(row);
  const when = new Date(training.start);
  const dateStr = when.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
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

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeDisabled={isPending}
      titleBadges={
        <>
          <span
            className={clsx(
              "badge badge-sm",
              training.is_paid ? "badge-warning" : "badge-success",
            )}
          >
            {training.is_paid ? "Paid" : "Free"}
          </span>
          {training.is_accredited ? (
            <span className="badge badge-info badge-sm">Accredited</span>
          ) : null}
          {training.is_club ? (
            <span className="badge badge-secondary badge-sm">Club</span>
          ) : null}
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-base-content/60 font-semibold">Time & date</dt>
            <dd>
              {timeStr}, {dateStr}
            </dd>
          </div>
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
          <div>
            <dt className="text-base-content/60 font-semibold">Places</dt>
            <dd>
              {placesFree} / {training.max_checkins} free
              {isFull ? " (full)" : ""}
            </dd>
          </div>
          {training.training_location ? (
            <div>
              <dt className="text-base-content/60 font-semibold">Location</dt>
              <dd>{training.training_location.name}</dd>
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
        {canShowCheckIn ? (
          row.checked_in ? (
            <button
              type="button"
              className="btn btn-error btn-outline"
              disabled={isPending}
              onClick={() =>
                setCheckin({
                  params: {
                    path: { training_id: training.id },
                    query: { checkin: false },
                  },
                })
              }
            >
              Cancel check-in
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isPending}
              onClick={() =>
                setCheckin({
                  params: {
                    path: { training_id: training.id },
                    query: { checkin: true },
                  },
                })
              }
            >
              Check in
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
