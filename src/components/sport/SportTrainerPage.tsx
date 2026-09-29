import { $sport } from "@/api/sport";
import type {
  SchemaTrainerInfoSchema,
  SchemaTrainingInfoPersonalSchema,
} from "@/api/sport/types.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportCheckinRulesModal } from "@/components/sport/SportCheckinRulesModal.tsx";
import { SportTrainerAttendanceModal } from "@/components/sport/SportTrainerAttendanceModal.tsx";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import {
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

const RECENT_TRAINING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const PAST_TRAININGS_LOOKBACK_MS = 8 * 7 * 24 * 60 * 60 * 1000;

export function SportTrainerPage() {
  const sport = useSportProfile();

  if (!sport.isTrainer || sport.studentId == null) {
    return (
      <div className="text-base-content/70 rounded-box border-base-300 border p-6 text-center text-sm">
        You are not registered as a sport trainer.
      </div>
    );
  }

  return (
    <SportTrainerContent
      studentId={sport.studentId}
      trainerGroupIds={sport.trainerGroupIds}
      trainerGroups={sport.profile?.trainer_info?.groups ?? []}
    />
  );
}

function SportTrainerContent({
  studentId,
  trainerGroupIds,
  trainerGroups,
}: {
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
  trainerGroups: SchemaTrainerInfoSchema["groups"];
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedCurrent, setSelectedCurrent] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);
  const [selectedUpcoming, setSelectedUpcoming] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);
  const [selectedPast, setSelectedPast] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const {
    data: currentSemester,
    isPending: semesterPending,
    isError: semesterError,
  } = $sport.useQuery("get", "/semesters/current");

  const periodStart = useMemo(
    () => new Date(startOfTodayMoscow().getTime() - PAST_TRAININGS_LOOKBACK_MS),
    [],
  );
  const periodEnd = useMemo(() => {
    const { end: weekEnd } = getSchedulePeriodBounds(0);
    if (!currentSemester) return weekEnd;

    const semesterEnd = new Date(`${currentSemester.end}T23:59:59+03:00`);
    return semesterEnd > weekEnd ? semesterEnd : weekEnd;
  }, [currentSemester]);

  const {
    data: personalSchedule,
    isPending: schedulePending,
    isError: scheduleError,
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
    { enabled: !semesterPending && !semesterError },
  );
  const isPending = semesterPending || schedulePending;

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

  const pastTrainings = useMemo(() => {
    const now = Date.now();

    return trainerTrainings
      .filter(
        (row) =>
          new Date(row.training.end).getTime() <=
          now - RECENT_TRAINING_WINDOW_MS,
      )
      .toReversed();
  }, [trainerTrainings]);

  if (semesterError || scheduleError) {
    return (
      <div className="alert alert-error">
        Trainer schedule could not be loaded.
      </div>
    );
  }

  return (
    <>
      {trainerGroups.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-base-content/55 text-xs font-bold tracking-widest uppercase">
            Teaching groups
          </p>
          <div className="flex flex-wrap gap-2">
            {trainerGroups.map((group) => (
              <span
                key={group.id}
                className="badge h-fit min-h-8 shrink-0 px-3 py-1.5 text-sm font-medium"
              >
                {group.display_name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-medium">Current Trainings</h2>
        <p className="text-base-content/60 text-sm">
          Trainings in progress or finished less than 3 days ago. Click a
          training to manage student attendance.
        </p>
        {isPending ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <Suspense fallback={<div className="skeleton h-40 w-full" />}>
            <SportTrainingsCalendarList
              rows={currentTrainings}
              emptyText="No current trainings"
              compactEmpty
              studentId={studentId}
              trainerGroupIds={trainerGroupIds}
              onSelect={setSelectedCurrent}
              onCheckinSuccess={() => setRulesOpen(true)}
            />
          </Suspense>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-medium">Upcoming Trainings</h2>
        {isPending ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <Suspense fallback={<div className="skeleton h-40 w-full" />}>
            <SportTrainingsCalendarList
              rows={upcomingTrainings}
              emptyText="No upcoming trainings"
              compactEmpty
              studentId={studentId}
              trainerGroupIds={trainerGroupIds}
              onSelect={setSelectedUpcoming}
              onCheckinSuccess={() => setRulesOpen(true)}
            />
          </Suspense>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-medium">Past Trainings</h2>
        <p className="text-base-content/60 text-sm">
          Finished trainings from the last 8 weeks. Click a training to view or
          update attendance.
        </p>
        {isPending ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <Suspense fallback={<div className="skeleton h-40 w-full" />}>
            <SportTrainingsCalendarList
              rows={pastTrainings}
              emptyText="No past trainings"
              compactEmpty
              studentId={studentId}
              trainerGroupIds={trainerGroupIds}
              onSelect={setSelectedPast}
              onCheckinSuccess={() => setRulesOpen(true)}
            />
          </Suspense>
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
          onCheckinSuccess={() => setRulesOpen(true)}
        />
      ) : null}

      {selectedPast ? (
        <SportTrainerAttendanceModal
          open
          onOpenChange={(open) => {
            if (!open) setSelectedPast(null);
          }}
          row={selectedPast}
        />
      ) : null}
      <SportCheckinRulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
    </>
  );
}
