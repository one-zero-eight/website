import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";
import { SportProgressSection } from "@/components/sport/SportOverviewSection.tsx";
import { isTrainerTraining } from "@/components/sport/sport-checkin-utils.ts";
import type { SportProfileReady } from "@/components/sport/sport-profile.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainerTrainingModal } from "@/components/sport/SportTrainerTrainingModal.tsx";
import { SportTrainingsCalendarList } from "@/components/sport/SportTrainingsCalendarList.tsx";
import {
  getSchedulePeriodBounds,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { useMemo, useState } from "react";

export function SportSchedulePage() {
  return (
    <SportPageShell>
      {(sport) => <SportScheduleContent {...sport} />}
    </SportPageShell>
  );
}

function SportScheduleContent({
  canQuerySport,
  studentId,
  trainerGroupIds,
  profile,
}: SportProfileReady) {
  const { data: hours } = $sport.useQuery(
    "get",
    "/students/{student_id}/hours-summary",
    { params: { path: { student_id: Number(studentId) } } },
    { enabled: canQuerySport && studentId != null },
  );

  const { data: currentSemester } = $sport.useQuery(
    "get",
    "/semesters/current",
    {},
    { enabled: canQuerySport },
  );

  return (
    <>
      <SportProgressSection
        hours={hours}
        currentSemester={currentSemester}
        medicalGroup={profile.student_info?.medical_group}
      />
      {studentId != null ? (
        <SportCalendar
          enabled={canQuerySport}
          studentId={studentId}
          trainerGroupIds={trainerGroupIds}
        />
      ) : null}
    </>
  );
}

function SportCalendar({
  enabled,
  studentId,
  trainerGroupIds,
}: {
  enabled: boolean;
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
      <div className="border-base-300 bg-base-100 border-t pt-4">
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
            <SportTrainingsCalendarList
              rows={filteredSchedule}
              emptyText="No trainings match the selected filters."
              studentId={studentId}
              trainerGroupIds={trainerGroupIds}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {renderSelectedTrainingModal()}
    </>
  );
}
