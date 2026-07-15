import type {
  SchemaSemesterSchema,
  SchemaStudentHoursSummarySchema,
} from "@/api/sport/types.ts";

export function SportProgressSection({
  hours,
  currentSemester,
}: {
  hours: SchemaStudentHoursSummarySchema | undefined;
  currentSemester: SchemaSemesterSchema | undefined;
}) {
  const required = hours?.required_hours ?? currentSemester?.required_hours;

  if (!hours || required == null) return null;

  const earned = hours.hours_from_groups + hours.self_sport_hours;
  const earnedPct = Math.min(100, (earned / required) * 100);
  const remaining = Math.max(0, required - earned);

  return (
    <div className="card card-border bg-base-100">
      <div className="card-body gap-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Progress</h3>
          {currentSemester ? (
            <p className="text-base-content/60 text-sm">
              {currentSemester.name}
            </p>
          ) : null}
        </div>
        <p className="text-base-content/80 text-center text-sm">
          Current sport hours:{" "}
          <span className="text-base-content font-semibold">
            {earned} out of {required} hours
          </span>
        </p>
        <div className="bg-base-200 overflow-hidden rounded-lg">
          <div className="grid grid-cols-2 px-4 py-2 text-xs font-semibold">
            <span className="text-info text-center">
              Regular sport ({hours.hours_from_groups}h)
            </span>
            <span className="text-primary text-center">
              Self-sport ({hours.self_sport_hours}h)
            </span>
          </div>
          <div className="bg-base-300 h-8 w-full">
            <div
              className="bg-info h-full"
              style={{ width: `${earnedPct}%` }}
              title="Earned hours"
            />
          </div>
        </div>
        {remaining > 0 ? (
          <p className="text-base-content/75 text-center text-sm">
            To pass the sport course you must get{" "}
            <span className="text-base-content font-semibold">
              {remaining} hours
            </span>{" "}
            more.
          </p>
        ) : null}
      </div>
    </div>
  );
}
