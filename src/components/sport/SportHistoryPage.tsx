import { $sport } from "@/api/sport";
import type {
  SchemaFitnessTestStudentSessionResultSchema,
  SchemaSemesterHistorySchema,
} from "@/api/sport/types.ts";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { cn } from "@/lib/ui/cn";

export function SportHistoryPage() {
  const { studentId } = useSportProfile();

  if (studentId == null) return null;

  return <SportHistoryContent studentId={studentId} />;
}

function SportHistoryContent({ studentId }: { studentId: number }) {
  const {
    data: semesters,
    isPending,
    isError,
  } = $sport.useQuery("get", "/students/{student_id}/semester-history", {
    params: { path: { student_id: studentId } },
  });

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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-3xl font-medium">Sport Hours History</h2>

      {sortedSemesters.length === 0 ? (
        <div className="text-base-content/70 rounded-box border-base-300 border p-6 text-center text-sm">
          No sport hours history yet.
        </div>
      ) : (
        sortedSemesters.map((semester) => (
          <SportHistorySemesterCard
            key={semester.semester_id}
            semester={semester}
          />
        ))
      )}
    </div>
  );
}

function SportHistorySemesterCard({
  semester,
}: {
  semester: SchemaSemesterHistorySchema;
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
    <div className="card card-border bg-base-100">
      <div className="card-body gap-3">
        <div>
          <h3 className="text-lg font-semibold">{semester.semester_name}</h3>
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
          <details className="mt-1">
            <summary className="text-base-content/70 cursor-pointer text-sm font-medium">
              {trainings.length} training{trainings.length === 1 ? "" : "s"}
            </summary>
            <ul className="bg-base-200/50 rounded-box mt-2 p-3">
              {trainings.map((training) => (
                <li
                  key={training.training_id}
                  className="border-base-300/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t py-1 text-sm first:border-t-0"
                >
                  <span>
                    <span className="font-medium">
                      {training.date} {training.time}
                    </span>{" "}
                    <span className="text-base-content/70">
                      {sportTrainingTitle({ training })}
                    </span>
                  </span>
                  <span className="font-medium">{training.hours}h</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {fitnessTests.length > 0 ? (
          <details className="mt-1">
            <summary className="text-base-content/70 cursor-pointer text-sm font-medium">
              Fitness test{fitnessTests.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-2 flex flex-col gap-3">
              {fitnessTests.map((fitnessTest) => (
                <FitnessTestResultCard
                  key={fitnessTest.session.id}
                  fitnessTest={fitnessTest}
                />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function FitnessTestResultCard({
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
    <li className="border-base-300 bg-base-200/50 rounded-box border-t p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : session.date}
        </span>
        <div className="flex items-center gap-2">
          {session.retake ? (
            <span className="badge badge-warning badge-sm">Retake</span>
          ) : null}
          <span
            className={cn(
              "badge badge-sm",
              passed ? "badge-success" : "badge-error",
            )}
          >
            {passed ? "Pass" : "Fail"}
          </span>
          <span className="font-semibold">
            {totalScore} / {maxScore} points
          </span>
        </div>
      </div>
      {exerciseResults.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {exerciseResults.map((result) => (
            <li
              key={result.exercise_id}
              className="border-base-300/60 flex flex-wrap items-center justify-between gap-2 border-t py-1 text-sm"
            >
              <span className="text-base-content/80">
                {result.exercise_name}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 text-right">
                <span className="text-base-content font-medium">
                  {result.display_value}
                </span>
                <span className="text-base-content/70">
                  {result.score} / {result.max_score} points
                </span>
              </span>
            </li>
          ))}
        </ul>
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
