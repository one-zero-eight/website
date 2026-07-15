import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainingsCalendarList } from "@/components/sport/SportTrainingsCalendarList.tsx";
import {
  getSchedulePeriodBounds,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export function SportPersonalCalendarSection({
  enabled,
  studentId,
  trainerGroupIds,
}: {
  enabled: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getSchedulePeriodBounds(0),
    [],
  );

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

  const upcomingCheckIns = useMemo(() => {
    const now = Date.now();

    return (personalSchedule ?? [])
      .filter(
        (row) =>
          row.checked_in &&
          row.training.max_checkins > 0 &&
          new Date(row.training.end).getTime() > now,
      )
      .toSorted(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
  }, [personalSchedule]);

  if (isError) {
    return (
      <div className="alert alert-error">
        Personal calendar could not be loaded.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-medium">Personal Calendar</h2>
        <Link to="/calendar" className="btn btn-outline btn-primary btn-sm">
          View full calendar
        </Link>
      </div>

      {isPending ? (
        <div className="skeleton h-64 w-full" />
      ) : (
        <SportTrainingsCalendarList
          rows={upcomingCheckIns}
          emptyText="No upcoming trainings"
          onSelect={(row) =>
            setSelected({
              ...row,
              checked_in: true,
              can_check_in: true,
            })
          }
        />
      )}

      {selected ? (
        <SportStudentTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          row={selected}
          studentId={studentId}
          trainerGroupIds={trainerGroupIds}
        />
      ) : null}
    </>
  );
}
