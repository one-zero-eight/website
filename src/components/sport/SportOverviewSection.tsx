import { $sport } from "@/api/sport";
import type {
  SchemaSemesterHistorySchema,
  SchemaSemesterSchema,
  SchemaStudentHoursSummarySchema,
  SchemaParsedStravaSchema,
  SchemaUserSchema,
} from "@/api/sport/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const SPORT_BOT = "https://t.me/IUSportBot";

function formatSemesterDate(v: unknown): string {
  if (v == null) return "-";
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? v
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  }
  return String(v);
}

function getDateTimeMs(value: unknown): number {
  if (typeof value !== "string") return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getFitnessTestDisplayValue({
  exercise,
  value,
  unit,
}: {
  exercise:
    | {
        select?: string[];
        unit?: string | null;
      }
    | undefined;
  value: string;
  unit: string | null;
}): string {
  if (exercise?.select?.length) {
    const selectedIndex = Number(value);
    return exercise.select[selectedIndex] ?? value;
  }

  return `${value}${unit ? ` ${unit}` : ""}`;
}

function getFitnessTestGrade({
  exercise,
  value,
}: {
  exercise:
    | {
        threshold?: number | null;
        select?: string[];
      }
    | undefined;
  value: string;
}): string {
  if (exercise?.threshold == null) return "-";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "-";

  return numericValue >= exercise.threshold ? "Pass" : "Fail";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SportOverviewSection({
  profile,
}: {
  profile: SchemaUserSchema;
}) {
  const [medicalGroupModalOpen, setMedicalGroupModalOpen] = useState(false);
  const isTrainer = !!profile.trainer_info?.groups?.length;
  const isStudent = !!profile.student_info;

  return (
    <>
      <div className="card card-border bg-base-100 overflow-hidden">
        <div className="card-body gap-0 p-0">
          <div className="border-base-300 from-base-200/50 to-base-100 border-b bg-linear-to-b px-5 py-5 @md:px-8">
            <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {isTrainer ? (
                  <span className="badge badge-primary h-fit min-h-8 shrink-0 px-3 py-1.5 text-sm font-semibold">
                    Teacher
                  </span>
                ) : null}
                {isStudent ? (
                  <span className="badge badge-secondary h-fit min-h-8 shrink-0 px-3 py-1.5 text-sm font-semibold">
                    Student
                  </span>
                ) : null}
                {profile.student_info?.medical_group ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="badge badge-success badge-outline h-fit min-h-8 shrink-0 border-2 px-3 py-1.5 text-sm font-semibold">
                      {profile.student_info.medical_group} medical group
                    </span>
                    {isStudent ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-xs"
                        onClick={() => setMedicalGroupModalOpen(true)}
                      >
                        <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
                      </button>
                    ) : null}
                  </div>
                ) : isStudent ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-outline btn-sm"
                    onClick={() => setMedicalGroupModalOpen(true)}
                  >
                    Submit medical group
                  </button>
                ) : null}
              </div>

              <a
                href={SPORT_BOT}
                className="text-base-content hover:text-primary flex w-fit flex-row items-center gap-2 text-sm font-semibold hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                <span className="icon-[ic--baseline-telegram] text-primary shrink-0 text-xl" />
                <span>Sport Bot</span>
              </a>
            </div>
          </div>

          {isTrainer && profile.trainer_info?.groups?.length ? (
            <div className="px-5 py-6 @md:px-8 @md:py-7">
              <p className="text-base-content/55 mb-4 text-xs font-bold tracking-widest uppercase">
                Teaching groups
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.trainer_info.groups.map((group) => (
                  <span
                    key={group.id}
                    className="badge badge-accent h-fit min-h-8 shrink-0 px-3 py-1.5 text-sm font-medium"
                  >
                    {group.display_name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <MedicalGroupReferenceModal
        open={medicalGroupModalOpen}
        onOpenChange={setMedicalGroupModalOpen}
      />
    </>
  );
}
export function SportProgressSection({
  hours,
  currentSemester,
}: {
  hours: SchemaStudentHoursSummarySchema | undefined;
  currentSemester: SchemaSemesterSchema | undefined;
}) {
  const [selfSportModalOpen, setSelfSportModalOpen] = useState(false);
  const [medicalLeaveModalOpen, setMedicalLeaveModalOpen] = useState(false);
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
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setSelfSportModalOpen(true)}
          >
            Self-sport upload
          </button>
          <button
            type="button"
            className="btn btn-primary btn-outline btn-sm"
            onClick={() => setMedicalLeaveModalOpen(true)}
          >
            Submit medical leave
          </button>
        </div>
      </div>
      <SelfSportUploadModal
        open={selfSportModalOpen}
        onOpenChange={setSelfSportModalOpen}
      />
      <MedicalLeaveUploadModal
        open={medicalLeaveModalOpen}
        onOpenChange={setMedicalLeaveModalOpen}
      />
    </div>
  );
}

export function SportSemesterHistorySection({
  semesterHistory,
  currentSemester,
  historyPending,
}: {
  semesterHistory: SchemaSemesterHistorySchema[] | undefined;
  currentSemester: SchemaSemesterSchema | undefined;
  historyPending: boolean;
}) {
  const { data: fitnessTestExercises } = $sport.useQuery(
    "get",
    "/fitness-test/exercises",
    {},
    { enabled: !historyPending && !!semesterHistory?.length },
  );

  if (historyPending) {
    return (
      <div className="card card-border bg-base-100">
        <div className="card-body gap-4">
          <h3 className="text-lg font-semibold">History</h3>
          <div className="skeleton h-32" />
        </div>
      </div>
    );
  }

  if (!semesterHistory?.length) {
    return (
      <div className="card card-border bg-base-100">
        <div className="card-body gap-4">
          <h3 className="text-lg font-semibold">History</h3>
          <p className="text-base-content/60 text-sm">No history yet.</p>
        </div>
      </div>
    );
  }

  const exerciseById = new Map(
    fitnessTestExercises?.map((exercise) => [exercise.id, exercise]) ?? [],
  );
  const sortedSemesterHistory = [...semesterHistory].sort(
    (left, right) =>
      getDateTimeMs(right.semester_start) - getDateTimeMs(left.semester_start),
  );

  return (
    <div className="grid gap-4">
      {sortedSemesterHistory.map((semester) => {
        const fitnessTests = (semester.fitness_tests ?? []).filter(
          (fitnessTest) => fitnessTest.exercise_results.length > 0,
        );

        return (
          <section
            key={semester.semester_id}
            className="card card-border bg-base-100"
          >
            <div className="card-body gap-5">
              <div>
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    currentSemester?.id === semester.semester_id &&
                      "text-primary",
                  )}
                >
                  {semester.semester_name}
                </h3>
                <p className="text-base-content/60 text-sm">
                  {formatSemesterDate(semester.semester_start)} -{" "}
                  {formatSemesterDate(semester.semester_end)}
                </p>
              </div>

              <p className="text-base-content/80 text-sm">
                You've got{" "}
                <span className="text-base-content font-semibold">
                  {semester.total_hours}
                </span>{" "}
                hours out of {semester.required_hours} required.
              </p>

              <div className="grid gap-3">
                <h4 className="text-sm font-semibold">Fitness test results</h4>
                {fitnessTests.length ? (
                  fitnessTests.map((fitnessTest) => (
                    <div
                      key={`${semester.semester_id}-${fitnessTest.session.id}`}
                      className="border-base-300 rounded-box border px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {semester.semester_name}
                          </p>
                          <p className="text-base-content/60 text-sm">
                            {formatDateTime(fitnessTest.session.date)}
                            {fitnessTest.session.retake ? " - Retake" : null}
                          </p>
                        </div>
                        <span className="text-base-content/60 text-sm">
                          {fitnessTest.session.teacher}
                        </span>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="table-sm table">
                          <thead>
                            <tr>
                              <th>Exercise</th>
                              <th>Result</th>
                              <th>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fitnessTest.exercise_results.map((result) => {
                              const exercise = exerciseById.get(
                                result.exercise_id,
                              );

                              return (
                                <tr key={result.exercise_id}>
                                  <td className="font-medium">
                                    {result.exercise_name}
                                  </td>
                                  <td>
                                    {getFitnessTestDisplayValue({
                                      exercise,
                                      value: result.value,
                                      unit: result.unit,
                                    })}
                                  </td>
                                  <td>
                                    {getFitnessTestGrade({
                                      exercise,
                                      value: result.value,
                                    })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base-content/60 text-sm">
                    No fitness test results for this semester.
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MedicalGroupReferenceModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const { mutate, isPending } = $sport.useMutation(
    "post",
    "/references/medical-group",
    {
      onSuccess: () => {
        showSuccess("Submitted", "Medical group reference was submitted.");
        setFiles([]);
        setComment("");
        onOpenChange(false);
        queryClient.invalidateQueries({
          queryKey: $sport.queryOptions("get", "/users/me").queryKey,
        });
      },
      onError: () => {
        showError("Error", "Failed to submit medical group reference.");
      },
    },
  );

  function handleSubmit() {
    if (files.length === 0 || isPending) return;

    const formData = new FormData();
    for (const file of files) {
      formData.append("images", file);
    }
    formData.append("student_comment", comment);

    mutate({
      // @ts-expect-error - FormData type mismatch with API
      body: formData,
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Medical Group Reference Submission"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          Please submit{" "}
          <span className="text-base-content font-semibold">
            an image of medical reference with your medical group data.
          </span>{" "}
          Based on the reference you will be assigned a health group.
        </p>

        <label className="form-control gap-1">
          <span className="label-text text-sm">Files</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="file-input file-input-bordered w-full"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        <label className="form-control gap-1">
          <span className="label-text text-sm">Comments (optional)</span>
          <textarea
            className="textarea textarea-bordered min-h-40 w-full"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={files.length === 0 || isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SelfSportUploadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [trainingTypeId, setTrainingTypeId] = useState("");
  const [activityLink, setActivityLink] = useState("");
  const [hours, setHours] = useState("");
  const [comment, setComment] = useState("");
  const [parsedData, setParsedData] = useState<SchemaParsedStravaSchema | null>(
    null,
  );
  const {
    data: trainingTypes,
    isPending: trainingTypesPending,
    isError: trainingTypesError,
  } = $sport.useQuery("get", "/self-sport/types", {}, { enabled: open });
  const { mutate: createReport, isPending: createReportPending } =
    $sport.useMutation("post", "/self-sport/reports", {
      onSuccess: () => {
        showSuccess("Submitted", "Self-sport report was submitted.");
        setTrainingTypeId("");
        setActivityLink("");
        setHours("");
        setComment("");
        setParsedData(null);
        onOpenChange(false);
        queryClient.invalidateQueries({
          queryKey: ["sport", "get", "/students/{student_id}/hours-summary"],
        });
        queryClient.invalidateQueries({
          queryKey: $sport.queryOptions("get", "/self-sport/reports").queryKey,
        });
      },
      onError: () => {
        showError("Error", "Failed to submit self-sport report.");
      },
    });
  const { refetch: parseActivity, isFetching: parseActivityFetching } =
    $sport.useQuery(
      "get",
      "/self-sport/parse-strava",
      { params: { query: { link: activityLink } } },
      {
        enabled: false,
        retry: false,
      },
    );
  const selectedTrainingType = trainingTypes?.find(
    (trainingType) => trainingType.id === Number(trainingTypeId),
  );

  async function handleActivityLinkBlur() {
    if (!activityLink) return;

    const result = await parseActivity();
    if (result.data) {
      setParsedData(result.data);
      setHours(result.data.hours.toString());
    }
  }

  function handleSubmit() {
    if (!trainingTypeId || !activityLink || !hours || createReportPending) {
      return;
    }

    createReport({
      body: {
        link: activityLink,
        training_type: Number(trainingTypeId),
        hours: Number(hours),
        student_comment: comment || null,
        parsed_data: parsedData,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Self Sport Upload">
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          Please submit <span className="font-semibold">a link</span> to your{" "}
          <a
            href="https://www.strava.com/"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
          >
            Strava
          </a>{" "}
          or{" "}
          <a
            href="https://www.trainingpeaks.com/"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
          >
            TrainingPeaks
          </a>{" "}
          activity.
        </p>

        <div className="alert alert-info justify-center py-2 text-sm">
          <span>
            Checking your workouts{" "}
            <span className="font-semibold">can take up to 2 weeks.</span>
          </span>
        </div>

        <select
          className="select select-bordered w-full"
          value={trainingTypeId}
          disabled={trainingTypesPending}
          onChange={(event) => setTrainingTypeId(event.target.value)}
        >
          <option value="">Select your training type</option>
          {trainingTypes?.map((trainingType) => (
            <option key={trainingType.id} value={trainingType.id}>
              {trainingType.name}
            </option>
          ))}
        </select>
        {trainingTypesError ? (
          <p className="text-error text-sm">
            Training types could not be loaded.
          </p>
        ) : null}

        <input
          type="url"
          className="input input-bordered w-full"
          placeholder="Activity link"
          value={activityLink}
          onBlur={handleActivityLinkBlur}
          onChange={(event) => {
            setActivityLink(event.target.value);
            setParsedData(null);
            setHours("");
          }}
        />

        <p className="text-base-content/80 text-sm">
          System{" "}
          <span className="text-base-content font-semibold">
            automatically set the number of hours
          </span>{" "}
          you have accumulated during the training.{" "}
          <span className="italic">Change it if something went wrong.</span>
        </p>

        <input
          type="number"
          min="0"
          step="0.5"
          className="input input-bordered w-full"
          placeholder={
            parseActivityFetching
              ? "Parsing activity link"
              : "Waiting for the activity link"
          }
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />

        <textarea
          className="textarea textarea-bordered min-h-20 w-full"
          placeholder="Leave comments here (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        {selectedTrainingType?.application_rule ? (
          <div className="collapse-arrow bg-base-300 collapse">
            <input type="checkbox" />
            <div className="collapse-title min-h-0 py-3 text-center text-sm">
              How do we calculate the number of hours?
            </div>
            <div className="collapse-content text-sm">
              {selectedTrainingType.application_rule}
            </div>
          </div>
        ) : (
          <div className="bg-base-300 rounded-box py-3 text-center text-sm">
            How do we calculate the number of hours?
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              !trainingTypeId ||
              !activityLink ||
              !hours ||
              createReportPending ||
              parseActivityFetching
            }
            onClick={handleSubmit}
          >
            {createReportPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MedicalLeaveUploadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comment, setComment] = useState("");
  const { mutate, isPending } = $sport.useMutation(
    "post",
    "/references/medical-leave",
    {
      onSuccess: () => {
        showSuccess("Submitted", "Medical leave reference was submitted.");
        setFile(null);
        setStartDate("");
        setEndDate("");
        setComment("");
        onOpenChange(false);
      },
      onError: () => {
        showError("Error", "Failed to submit medical leave reference.");
      },
    },
  );

  function handleSubmit() {
    if (!file || !startDate || !endDate || isPending) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("start", startDate);
    formData.append("end", endDate);
    formData.append("student_comment", comment);

    mutate({
      // @ts-expect-error - FormData type mismatch with API
      body: formData,
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Medical Reference Submission"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          Please submit an image of the medical reference. Specify the range of
          dates (illness period) and leave comments if necessary.
        </p>

        <div className="border-base-300 border-t pt-4">
          <p className="text-base-content/80 text-sm">
            The{" "}
            <span className="text-base-content font-semibold">week missed</span>{" "}
            due to illness is{" "}
            <span className="text-base-content font-semibold">
              compensated by two sports hours.
            </span>
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          className="file-input file-input-bordered w-full"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <div className="grid gap-2 @md:grid-cols-2">
          <label className="form-control gap-1">
            <span className="label-text text-center text-sm">Start date</span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="form-control gap-1">
            <span className="label-text text-center text-sm">End date</span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <textarea
          className="textarea textarea-bordered min-h-24 w-full"
          placeholder="Leave comments here (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <div className="flex justify-between gap-2">
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || !startDate || !endDate || isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
