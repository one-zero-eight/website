import { $clubs } from "@/api/clubs";
import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { SportProgressSection } from "@/components/sport/SportOverviewSection.tsx";
import { isTrainerTraining } from "@/components/sport/sport-checkin-utils.ts";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainerTrainingModal } from "@/components/sport/SportTrainerTrainingModal.tsx";
import {
  formatTimeRangeMoscow,
  getSchedulePeriodBounds,
  startOfTodayMoscow,
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
          semesterEnd={currentSemester?.end}
        />
      ) : null}
    </>
  );
}

function SportCalendar({
  studentId,
  trainerGroupIds,
  semesterEnd,
}: {
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
  semesterEnd?: string;
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

  const upcomingStart = useMemo(() => startOfTodayMoscow(), []);
  const upcomingEnd = useMemo(() => {
    const semesterEndDate = semesterEnd
      ? new Date(`${semesterEnd}T23:59:59+03:00`)
      : null;
    return semesterEndDate && semesterEndDate > upcomingStart
      ? semesterEndDate
      : new Date(upcomingStart.getTime() + 90 * 24 * 60 * 60 * 1000);
  }, [semesterEnd, upcomingStart]);
  const {
    data: upcomingSchedule,
    isPending: upcomingPending,
    isError: upcomingError,
  } = $sport.useQuery("get", "/users/me/schedule", {
    params: {
      query: {
        start: toScheduleApiDateTime(
          new Date(upcomingStart.getTime() - 7 * 24 * 60 * 60 * 1000),
        ),
        end: toScheduleApiDateTime(upcomingEnd),
      },
    },
  });

  const enrolledTrainings = useMemo(
    () =>
      (upcomingSchedule ?? [])
        .filter(
          (row) =>
            row.checked_in && new Date(row.training.end).getTime() > Date.now(),
        )
        .toSorted(
          (a, b) =>
            new Date(a.training.start).getTime() -
            new Date(b.training.start).getTime(),
        ),
    [upcomingSchedule],
  );

  const filteredSchedule = useMemo(() => {
    return (personalSchedule ?? []).toSorted(
      (a, b) =>
        new Date(a.training.start).getTime() -
        new Date(b.training.start).getTime(),
    );
  }, [personalSchedule]);

  function shiftPeriod(delta: number) {
    setPeriodOffset((offset) => offset + delta);
  }

  function renderSelectedTrainingModal() {
    if (!selected) return null;

    const currentSelection =
      filteredSchedule.find(
        (row) => row.training.id === selected.training.id,
      ) ??
      enrolledTrainings.find(
        (row) => row.training.id === selected.training.id,
      ) ??
      selected;

    if (isTrainerTraining(currentSelection, trainerGroupIds)) {
      return (
        <SportTrainerTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          row={currentSelection}
        />
      );
    }

    return (
      <SportStudentTrainingModal
        open
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        row={currentSelection}
        studentId={studentId}
        trainerGroupIds={trainerGroupIds}
      />
    );
  }

  return (
    <>
      <EnrolledTrainings
        rows={enrolledTrainings}
        isPending={upcomingPending}
        isError={upcomingError}
        onSelect={setSelected}
      />
      <div className="bg-base-100">
        <div className="-mx-4 flex flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-4">
            <div className="text-3xl font-medium">Trainings</div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="btn btn-sm rounded-xl"
                onClick={() => setPeriodOffset(0)}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-sm rounded-xl"
                onClick={() => shiftPeriod(-1)}
              >
                <span className="icon-[material-symbols--chevron-left] text-xl" />
              </button>
              <button
                type="button"
                className="btn btn-sm rounded-xl"
                onClick={() => shiftPeriod(1)}
              >
                <span className="icon-[material-symbols--chevron-right] text-xl" />
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

function EnrolledTrainings({
  rows,
  isPending,
  isError,
  onSelect,
}: {
  rows: SchemaTrainingInfoPersonalSchema[];
  isPending: boolean;
  isError: boolean;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
}) {
  const { data: clubs, isError: clubsError } = $clubs.useQuery(
    "get",
    "/clubs/",
    {},
    { enabled: rows.length > 0 },
  );
  const clubsBySportId = useMemo(
    () =>
      new Map(
        clubs
          ?.filter((club) => club.is_active && club.sport_id != null)
          .map((club) => [club.sport_id, club] as const),
      ),
    [clubs],
  );

  if (!isPending && !isError && rows.length === 0) return null;

  return (
    <section className="mb-6 flex flex-col gap-3">
      <h2 className="text-2xl font-medium">My upcoming trainings</h2>
      {isError || clubsError ? (
        <div className="alert alert-error">
          {isError
            ? "Enrolled trainings could not be loaded."
            : "Club logos could not be loaded."}
        </div>
      ) : null}
      {isPending ? (
        <div className="skeleton h-24 w-full" />
      ) : rows.length > 0 ? (
        <div className="grid gap-2 @lg/content:grid-cols-2">
          {rows.map((row) => {
            const training = row.training;
            const club =
              training.sport_id == null
                ? undefined
                : clubsBySportId.get(String(training.sport_id));
            const date = new Date(training.start).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              weekday: "short",
              timeZone: "Europe/Moscow",
            });

            return (
              <button
                key={training.id}
                type="button"
                className="border-base-300 hover:border-success hover:bg-success/5 flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                onClick={() => onSelect(row)}
              >
                {club?.id ? (
                  <ClubLogo
                    clubId={club.id}
                    logoFileId={club.logo_file_id}
                    className="size-12 bg-transparent [&>img]:bg-transparent"
                  />
                ) : (
                  <span className="size-12 shrink-0" />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-success font-semibold">
                    {sportTrainingTitle(row)}
                  </span>
                  <span className="text-base-content/70 text-xs">
                    {date} ·{" "}
                    {formatTimeRangeMoscow(training.start, training.end)}
                  </span>
                  {training.training_location ? (
                    <span className="text-base-content/60 truncate text-xs">
                      {training.training_location.name}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
