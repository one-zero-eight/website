import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainerAttendanceModal } from "@/components/sport/SportTrainerAttendanceModal.tsx";
import { SportTrainingsCalendarList } from "@/components/sport/SportTrainingsCalendarList.tsx";
import {
  getSchedulePeriodBounds,
  startOfTodayMoscow,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { useMemo, useState } from "react";

const RECENT_TRAINING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function SportTrainerSection({
  enabled,
  studentId,
  trainerGroupIds,
}: {
  enabled: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const [selectedCurrent, setSelectedCurrent] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);
  const [selectedUpcoming, setSelectedUpcoming] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(() => {
    const { end } = getSchedulePeriodBounds(0);
    const start = new Date(
      startOfTodayMoscow().getTime() - RECENT_TRAINING_WINDOW_MS,
    );
    return { start, end };
  }, []);

  const {
    data: personalSchedule,
    isPending,
    isError,
  } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: toScheduleApiDateTime(periodStart),
          end: toScheduleApiDateTime(periodEnd),
        },
      },
    },
    { enabled },
  );

  const trainerTrainings = useMemo(() => {
    return (personalSchedule ?? [])
      .filter((row) => trainerGroupIds.has(row.training.group_id))
      .toSorted(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
  }, [personalSchedule, trainerGroupIds]);

  const currentTrainings = useMemo(() => {
    const now = Date.now();

    return trainerTrainings.filter(
      (row) =>
        new Date(row.training.start).getTime() <= now &&
        new Date(row.training.end).getTime() > now - RECENT_TRAINING_WINDOW_MS,
    );
  }, [trainerTrainings]);

  const upcomingTrainings = useMemo(() => {
    const now = Date.now();

    return trainerTrainings.filter(
      (row) => new Date(row.training.start).getTime() > now,
    );
  }, [trainerTrainings]);

  if (isError) {
    return (
      <div className="alert alert-error">
        Trainer calendar could not be loaded.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-medium">Current Trainings</h2>
        <p className="text-base-content/60 text-sm">
          Trainings in progress or finished less than 3 days ago. Click a
          training to manage student attendance.
        </p>
        {isPending ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <SportTrainingsCalendarList
            rows={currentTrainings}
            emptyText="No current trainings"
            compactEmpty
            onSelect={setSelectedCurrent}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-medium">Upcoming Trainings</h2>
        {isPending ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <SportTrainingsCalendarList
            rows={upcomingTrainings}
            emptyText="No upcoming trainings"
            compactEmpty
            onSelect={setSelectedUpcoming}
          />
        )}
      </div>

      {selectedCurrent ? (
        <SportTrainerAttendanceModal
          open
          onOpenChange={(open) => {
            if (!open) setSelectedCurrent(null);
          }}
          row={selectedCurrent}
        />
      ) : null}

      {selectedUpcoming ? (
        <SportStudentTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelectedUpcoming(null);
          }}
          row={selectedUpcoming}
          studentId={studentId}
          trainerGroupIds={trainerGroupIds}
        />
      ) : null}
    </>
  );
}
