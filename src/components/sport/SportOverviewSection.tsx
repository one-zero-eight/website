import type {
  SchemaSemesterHistorySchema,
  SchemaSemesterSchema,
  SchemaStudentHoursSummarySchema,
  SchemaUserSchema,
} from "@/api/sport/types.ts";
import clsx from "clsx";

const SPORT_PORTAL = "https://sport.innopolis.university";

function nameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    (parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? "")
  ).toUpperCase();
}

function formatSemesterDate(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US");
  }
  return String(v);
}

export function SportOverviewSection({
  profile,
  hours,
  currentSemester,
  semesterHistory,
  historyPending,
}: {
  profile: SchemaUserSchema;
  hours: SchemaStudentHoursSummarySchema | undefined;
  currentSemester: SchemaSemesterSchema | undefined;
  semesterHistory: SchemaSemesterHistorySchema[] | undefined;
  historyPending: boolean;
}) {
  const isTrainer = !!profile.trainer_info?.groups?.length;
  const isStudent = !!profile.student_info;

  const earned =
    hours != null
      ? hours.hours_from_groups + hours.self_sport_hours
      : undefined;
  const required = hours?.required_hours ?? currentSemester?.required_hours;
  const groupPct =
    hours && required
      ? Math.min(100, (hours.hours_from_groups / required) * 100)
      : 0;
  const selfPct =
    hours && required
      ? Math.min(100, (hours.self_sport_hours / required) * 100)
      : 0;
  const remaining =
    hours && required != null
      ? Math.max(
          0,
          required - (hours.hours_from_groups + hours.self_sport_hours),
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="card card-border bg-base-100 overflow-hidden">
        <div className="card-body gap-0 p-0">
          <div className="border-base-300 from-base-200/50 to-base-100 border-b bg-linear-to-b px-5 py-6 @md:px-8 @md:py-8">
            <div className="flex flex-col gap-6 @lg:flex-row @lg:items-start @lg:gap-10">
              <div
                className="bg-primary/15 text-primary ring-base-300/60 flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl text-xl font-bold tracking-wide ring-2 ring-inset @md:size-24 @md:rounded-3xl @md:text-2xl"
                aria-hidden
              >
                {nameInitials(profile.full_name)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 @sm:flex-row @sm:flex-wrap @sm:items-baseline @sm:gap-x-4 @sm:gap-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight @md:text-4xl">
                    {profile.full_name}
                  </h2>
                  {isTrainer ? (
                    <span className="badge badge-primary h-fit min-h-10 shrink-0 px-4 py-2 text-sm font-semibold @md:text-base">
                      Teacher
                    </span>
                  ) : isStudent ? (
                    <span className="badge badge-secondary h-fit min-h-10 shrink-0 px-4 py-2 text-sm font-semibold @md:text-base">
                      Student
                    </span>
                  ) : null}
                </div>

                {profile.student_info ? (
                  <p className="text-base-content/80 mt-4 text-lg leading-snug @md:text-xl">
                    <span className="text-base-content font-semibold">
                      {profile.student_info.student_status}
                    </span>
                    {currentSemester ? (
                      <>
                        <span className="text-base-content/50 mx-1">·</span>
                        <span>{currentSemester.name} semester</span>
                      </>
                    ) : null}
                  </p>
                ) : null}

                {profile.student_info?.medical_group ? (
                  <div className="mt-4">
                    <span className="badge badge-success badge-outline h-fit min-h-10 border-2 px-4 py-2 text-sm font-medium @md:text-base">
                      {profile.student_info.medical_group}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isTrainer && profile.trainer_info?.groups?.length ? (
            <div className="px-5 py-6 @md:px-8 @md:py-7">
              <p className="text-base-content/55 mb-4 text-xs font-bold tracking-widest uppercase">
                Teaching groups
              </p>
              <div className="flex flex-wrap gap-2.5 @md:gap-3">
                {profile.trainer_info.groups.map((g) => (
                  <span
                    key={g.id}
                    className="badge badge-accent h-fit min-h-10 shrink-0 px-4 py-2.5 text-sm font-medium @md:px-5 @md:text-base"
                  >
                    {g.display_name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {hours && required != null ? (
        <div className="card card-border bg-base-100">
          <div className="card-body gap-3">
            <h3 className="text-center text-lg font-semibold">Progress</h3>
            <p className="text-base-content/80 text-center text-sm">
              Current sport hours:{" "}
              <span className="text-base-content font-semibold">
                {earned} out of {required} hours
              </span>
            </p>
            <div className="flex justify-between text-xs font-medium">
              <span>Self-sport ({hours.self_sport_hours}h)</span>
              <span>Sport group ({hours.hours_from_groups}h)</span>
            </div>
            <div className="bg-base-300/80 flex h-3 w-full gap-px overflow-hidden rounded-full">
              <div
                className="bg-secondary h-full"
                style={{ width: `${groupPct}%` }}
                title="Group hours"
              />
              <div
                className="bg-primary h-full"
                style={{ width: `${selfPct}%` }}
                title="Self-sport hours"
              />
            </div>
            {remaining != null && remaining > 0 ? (
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
      ) : null}

      {isStudent ? (
        <div className="card card-border bg-base-100">
          <div className="card-body gap-3">
            <h3 className="text-lg font-semibold">Overall sport hours</h3>
            {historyPending ? (
              <div className="bg-base-200 rounded-box h-24 animate-pulse" />
            ) : semesterHistory?.length ? (
              <div className="overflow-x-auto">
                <table className="table-zebra table-sm table">
                  <thead>
                    <tr>
                      <th>Semester</th>
                      <th>Start</th>
                      <th>End</th>
                      <th className="text-end">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterHistory.map((row) => (
                      <tr
                        key={row.semester_id}
                        className={clsx(
                          currentSemester?.id === row.semester_id &&
                            "bg-base-200",
                        )}
                      >
                        <td className="font-medium">{row.semester_name}</td>
                        <td>{formatSemesterDate(row.semester_start)}</td>
                        <td>{formatSemesterDate(row.semester_end)}</td>
                        <td className="text-end">{row.total_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-base-content/60 text-sm">No history yet.</p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex flex-wrap gap-2">
                <a
                  href={SPORT_PORTAL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  Self-sport upload
                  <span className="icon-[material-symbols--open-in-new-rounded] text-lg" />
                </a>
                <a
                  href={SPORT_PORTAL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-neutral"
                >
                  Change medical group
                  <span className="icon-[material-symbols--open-in-new-rounded] text-lg" />
                </a>
              </div>
              <p className="text-base-content/75 text-sm">
                Could not do sports for a while?
              </p>
              <a
                href={SPORT_PORTAL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-neutral btn-outline w-fit"
              >
                Submit medical reference
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
