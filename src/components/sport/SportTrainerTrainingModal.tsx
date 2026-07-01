import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { formatTimeRangeMoscow } from "@/components/sport/sport-week-utils.ts";

export function SportTrainerTrainingModal({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemaTrainingInfoPersonalSchema;
}) {
  const trainingId = row.training.id;
  const {
    data: trainingInfo,
    isPending: trainingInfoPending,
    isError: trainingInfoError,
  } = $sport.useQuery(
    "get",
    "/trainings/{training_id}",
    { params: { path: { training_id: Number(trainingId) } } },
    { enabled: open && trainingId != null },
  );

  const title = sportTrainingTitle(row) + " (Trainer)";

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {trainingInfoPending ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ) : trainingInfoError ? (
          <div className="alert alert-error">
            Training details could not be loaded.
          </div>
        ) : trainingInfo ? (
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-base-content/60 font-semibold">
                Time & date
              </dt>
              <dd>
                {formatTimeRangeMoscow(trainingInfo.start, trainingInfo.end)},{" "}
                {new Date(trainingInfo.start).toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  timeZone: "Europe/Moscow",
                })}
              </dd>
            </div>
            {trainingInfo.sport_name ? (
              <div>
                <dt className="text-base-content/60 font-semibold">Sport</dt>
                <dd>{trainingInfo.sport_name}</dd>
              </div>
            ) : null}
            {trainingInfo.group_name ? (
              <div>
                <dt className="text-base-content/60 font-semibold">Group</dt>
                <dd>{trainingInfo.group_name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-base-content/60 font-semibold">Check-ins</dt>
              <dd>
                {trainingInfo.checkins_count} / {trainingInfo.max_checkins}
                {trainingInfo.checkins_count >= trainingInfo.max_checkins
                  ? " (full)"
                  : ""}
              </dd>
            </div>
            {trainingInfo.training_location ? (
              <div>
                <dt className="text-base-content/60 font-semibold">Location</dt>
                <dd>{trainingInfo.training_location.name}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="border-t-base-300 flex shrink-0 flex-wrap gap-2 border-t p-4">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    </SportTrainingModalShell>
  );
}
