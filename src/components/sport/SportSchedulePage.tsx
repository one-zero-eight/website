import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportProgressSection } from "@/components/sport/SportOverviewSection.tsx";
import { isTrainerTraining } from "@/components/sport/sport-checkin-utils.ts";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainerTrainingModal } from "@/components/sport/SportTrainerTrainingModal.tsx";
import {
  getSchedulePeriodBounds,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { lazy, Suspense, useMemo, useState } from "react";

const SportTrainingsCalendarList = lazy(() =>
  import("@/components/sport/SportTrainingsCalendarList.tsx").then(
    (module) => ({
      default: module.SportTrainingsCalendarList,
    }),
  ),
);

export function SportSchedulePage() {
  const { studentId, trainerGroupIds } = useSportProfile();
  const { data: hours } = $sport.useQuery(
    "get",
    "/students/{student_id}/hours-summary",
    { params: { path: { student_id: Number(studentId) } } },
    { enabled: studentId != null },
  );

  const { data: currentSemester } = $sport.useQuery(
    "get",
    "/semesters/current",
  );

  return (
    <>
      <SportProgressSection
        hours={hours}
        currentSemester={currentSemester}
        studentId={studentId}
      />
      {studentId != null ? (
        <SportCalendar
          studentId={studentId}
          trainerGroupIds={trainerGroupIds}
        />
      ) : null}
    </>
  );
}

function SportCalendar({
  studentId,
  trainerGroupIds,
}: {
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const [periodOffset, setPeriodOffset] = useState(0);
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getSchedulePeriodBounds(periodOffset),
    [periodOffset],
  );

  const {
    data: personalSchedule,
    isPending,
    isError,
  } = $sport.useQuery("get", "/users/me/schedule", {
    params: {
      query: {
        start: toScheduleApiDateTime(periodStart),
        end: toScheduleApiDateTime(periodEnd),
      },
    },
  });

  const filteredSchedule = useMemo(() => {
    return (personalSchedule ?? [])
      .filter((row) => row.training.max_checkins > 0)
      .toSorted(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
  }, [personalSchedule]);

  function shiftPeriod(delta: number) {
    setPeriodOffset((offset) => offset + delta);
  }

  function renderSelectedTrainingModal() {
    if (!selected) {
      return null;
    }

    if (isTrainerTraining(selected, trainerGroupIds)) {
      return (
        <SportTrainerTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          row={selected}
        />
      );
    }

    return (
      <SportStudentTrainingModal
        open
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        row={selected}
        studentId={studentId}
        trainerGroupIds={trainerGroupIds}
      />
    );
  }

  return (
    <>
      <div className="bg-base-100">
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="grow text-3xl font-medium">Sport calendar</div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setPeriodOffset(0)}
            >
              today
            </button>
            <div className="join">
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftPeriod(-1)}
              >
                <span className="icon-[material-symbols--chevron-left] text-lg" />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-primary btn-sm join-item"
                onClick={() => shiftPeriod(1)}
              >
                <span className="icon-[material-symbols--chevron-right] text-lg" />
              </button>
            </div>
          </div>

          {isPending ? (
            <div className="skeleton h-96 w-full" />
          ) : isError ? (
            <div className="alert alert-error">
              Schedule could not be loaded.
            </div>
          ) : (
            <Suspense fallback={<div className="skeleton h-96 w-full" />}>
              <SportTrainingsCalendarList
                rows={filteredSchedule}
                emptyText="No trainings match the selected filters."
                studentId={studentId}
                trainerGroupIds={trainerGroupIds}
                onSelect={setSelected}
              />
            </Suspense>
          )}
        </div>
      </div>

      {renderSelectedTrainingModal()}
    </>
  );
}
