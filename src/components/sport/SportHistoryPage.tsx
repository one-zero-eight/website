import { $clubs } from "@/api/clubs";
import type { SchemaClub } from "@/api/clubs/types.ts";
import { $sport } from "@/api/sport";
import type {
  SchemaFitnessTestStudentSessionResultSchema,
  SchemaSemesterHistorySchema,
  SchemaTrainingHistorySchema,
  SchemaTrainingInfoPersonalSchema,
} from "@/api/sport/types.ts";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import { cn } from "@/lib/ui/cn";
import { useState } from "react";

export function SportHistoryPage() {
  const { studentId } = useSportProfile();

  if (studentId == null) return null;

  return <SportHistoryContent studentId={studentId} />;
}

function SportHistoryContent({ studentId }: { studentId: number }) {
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(
    null,
  );
  const {
    data: semesters,
    isPending,
    isError,
  } = $sport.useQuery("get", "/students/{student_id}/semester-history", {
    params: { path: { student_id: studentId } },
  });
  const { data: currentSemester, isError: currentSemesterError } =
    $sport.useQuery("get", "/semesters/current");
  const { data: clubs, isError: clubsError } = $clubs.useQuery(
    "get",
    "/clubs/",
  );
  const { data: sports, isError: sportsError } = $sport.useQuery(
    "get",
    "/sports",
  );
  const {
    data: selectedTraining,
    isPending: trainingPending,
    isError: trainingError,
  } = $sport.useQuery(
    "get",
    "/trainings/{training_id}",
    { params: { path: { training_id: Number(selectedTrainingId) } } },
    { enabled: selectedTrainingId != null },
  );

  if (isError) {
    return (
      <div className="alert alert-error">
        Sport hours history could not be loaded.
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  const sortedSemesters = [...(semesters ?? [])].sort((a, b) => {
    const aDate = toDateSafe(a.semester_start);
    const bDate = toDateSafe(b.semester_start);
    if (aDate && bDate) return bDate.getTime() - aDate.getTime();
    return b.semester_id - a.semester_id;
  });
  const clubsBySportId = new Map(
    clubs?.flatMap((club) =>
      club.is_active && club.sport_id != null
        ? [[club.sport_id, club] as const]
        : [],
    ),
  );
  const sportIdsByName = new Map(
    sports?.map((sport) => [sport.name.toLocaleLowerCase(), sport.id] as const),
  );

  return (
    <div>
      {currentSemesterError ? (
        <p className="text-error mb-4 text-sm">
          Current semester could not be loaded.
        </p>
      ) : null}
      {clubsError || sportsError ? (
        <p className="text-error mb-4 text-sm">
          Club logos could not be loaded.
        </p>
      ) : null}
      {sortedSemesters.length === 0 ? (
        <p className="text-base-content/70 py-6 text-center text-sm">
          No sport hours history yet.
        </p>
      ) : (
        <div className="divide-base-300 divide-y">
          {sortedSemesters.map((semester) => (
            <SportHistorySemester
              key={`${semester.semester_id}-${semester.semester_id === currentSemester?.id}`}
              semester={semester}
              isCurrent={semester.semester_id === currentSemester?.id}
              clubsBySportId={clubsBySportId}
              sportIdsByName={sportIdsByName}
              onSelectTraining={setSelectedTrainingId}
            />
          ))}
        </div>
      )}
      {selectedTrainingId != null && (trainingPending || trainingError) ? (
        <SportTrainingModalShell
          open
          onOpenChange={(open) => {
            if (!open) setSelectedTrainingId(null);
          }}
          title="Training"
        >
          {trainingPending ? (
            <div className="skeleton m-4 h-32" />
          ) : (
            <p className="text-error p-4">
              Training details could not be loaded.
            </p>
          )}
        </SportTrainingModalShell>
      ) : null}
      {selectedTrainingId != null && selectedTraining ? (
        <SportStudentTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelectedTrainingId(null);
          }}
          row={
            {
              training: selectedTraining,
              checked_in: true,
              can_check_in: false,
              can_grade: false,
              can_edit: false,
            } satisfies SchemaTrainingInfoPersonalSchema
          }
          studentId={studentId}
          trainerGroupIds={new Set()}
          onCheckinSuccess={() => setSelectedTrainingId(null)}
          readOnly
        />
      ) : null}
    </div>
  );
}

function SportHistorySemester({
  semester,
  isCurrent,
  clubsBySportId,
  sportIdsByName,
  onSelectTraining,
}: {
  semester: SchemaSemesterHistorySchema;
  isCurrent: boolean;
  clubsBySportId: ReadonlyMap<string, SchemaClub>;
  sportIdsByName: ReadonlyMap<string, number>;
  onSelectTraining: (trainingId: number) => void;
}) {
  const { required_hours: required, total_hours: earned } = semester;
  const dateRange = formatSemesterDateRange(
    semester.semester_start,
    semester.semester_end,
  );
  const trainings = semester.trainings;
  // The API lists every fitness test session held that semester, not just
  // the ones this student actually took — sessions with no recorded
  // exercise results aren't this student's test and must be filtered out.
  const fitnessTests = (semester.fitness_tests ?? []).filter(
    (fitnessTest) => fitnessTest.exercise_results.length > 0,
  );

  return (
    <section className="flex flex-col gap-3 py-6 first:pt-0 last:pb-0">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{semester.semester_name}</h3>
          {isCurrent ? (
            <span className="text-base-content/60 text-sm">
              (current semester)
            </span>
          ) : null}
        </div>
        {dateRange ? (
          <p className="text-base-content/60 text-sm">{dateRange}</p>
        ) : null}
      </div>

      <p className="text-base-content/80 text-sm">
        Sport hours:{" "}
        <span className="text-base-content font-semibold">
          {earned} out of {required} hours
        </span>
      </p>

      {trainings.length === 0 ? (
        <p className="text-base-content/70 mt-1 text-sm font-medium">
          0 trainings
        </p>
      ) : (
        <details className="mt-1" open={isCurrent}>
          <summary className="text-base-content/70 cursor-pointer text-sm font-medium">
            {trainings.length} training{trainings.length === 1 ? "" : "s"}
          </summary>
          <ul className="bg-base-200/50 rounded-box mt-2 px-3">
            {trainings.map((training) => (
              <SportHistoryTrainingRow
                key={`${training.training_id}-${training.date}-${training.time}`}
                training={training}
                club={clubsBySportId.get(
                  String(
                    sportIdsByName.get(
                      training.sport_name?.toLocaleLowerCase() ?? "",
                    ),
                  ),
                )}
                onSelectTraining={onSelectTraining}
              />
            ))}
          </ul>
        </details>
      )}

      {fitnessTests.length > 0 ? (
        <details className="mt-1" open={isCurrent}>
          <summary className="text-base-content/70 cursor-pointer text-sm font-medium">
            Fitness test{fitnessTests.length === 1 ? "" : "s"}
          </summary>
          <ul className="bg-base-200/50 rounded-box mt-2 px-3">
            {fitnessTests.map((fitnessTest) => (
              <FitnessTestResultRow
                key={fitnessTest.session.id}
                fitnessTest={fitnessTest}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function SportHistoryTrainingRow({
  training,
  club,
  onSelectTraining,
}: {
  training: SchemaTrainingHistorySchema;
  club?: SchemaClub;
  onSelectTraining: (trainingId: number) => void;
}) {
  const content = (
    <>
      <span className="text-base-content/60 shrink-0 text-xs tabular-nums">
        {training.date} {training.time}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        {club?.id ? (
          <ClubLogo
            clubId={club.id}
            logoFileId={club.logo_file_id}
            className="size-7 rounded-none bg-transparent [&>img]:bg-transparent [&>span]:size-5"
          />
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <span>{sportTrainingTitle({ training })}</span>
        {training.hours > 0 ? (
          <span className="badge badge-success badge-sm">
            {training.hours}h
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <li className="border-base-300/60 border-t text-sm first:border-t-0">
      {training.training_id > 0 ? (
        <button
          type="button"
          className="hover:bg-base-300/50 flex w-full flex-wrap items-center gap-2 py-1 text-left"
          onClick={() => onSelectTraining(training.training_id)}
        >
          {content}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 py-1">{content}</div>
      )}
    </li>
  );
}

function FitnessTestResultRow({
  fitnessTest,
}: {
  fitnessTest: SchemaFitnessTestStudentSessionResultSchema;
}) {
  const {
    session,
    exercise_results: exerciseResults,
    total_score: totalScore,
    max_score: maxScore,
    passed,
  } = fitnessTest;
  const date = toDateSafe(session.date);

  return (
    <li className="border-base-300/60 border-t py-3 text-sm first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {date
              ? date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : session.date}
          </span>
          {session.retake ? (
            <span className="badge badge-warning badge-sm">Retake</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">
            {totalScore}/{maxScore} points
          </span>
          <span
            className={cn(
              "badge badge-sm",
              passed ? "badge-success" : "badge-error",
            )}
          >
            {passed ? "Pass" : "Fail"}
          </span>
        </div>
      </div>
      {exerciseResults.length > 0 ? (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(4rem,auto)_minmax(4rem,auto)] items-center gap-x-3 gap-y-1.5 text-xs @md/content:gap-x-6">
          <span className="text-base-content/50 font-medium">Exercise</span>
          <span className="text-base-content/50 text-right font-medium">
            Result
          </span>
          <span className="text-base-content/50 text-right font-medium">
            Points
          </span>
          {exerciseResults.map((result) => (
            <div key={result.exercise_id} className="contents">
              <span className="min-w-0">{result.exercise_name}</span>
              <span className="text-right font-medium">
                {result.display_value}
              </span>
              <span className="text-base-content/70 text-right tabular-nums">
                {result.score}/{result.max_score}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function formatSemesterDateRange(start: unknown, end: unknown): string | null {
  const startDate = toDateSafe(start);
  const endDate = toDateSafe(end);
  if (!startDate || !endDate) {
    return null;
  }

  const format = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return `${format(startDate)} – ${format(endDate)}`;
}

function toDateSafe(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
