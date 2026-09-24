import { $sport } from "@/api/sport";
import type {
  SchemaParsedStravaSchema,
  SchemaSemesterSchema,
  SchemaStudentHoursSummarySchema,
} from "@/api/sport/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { queryClient } from "@/app/query-client.ts";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function SportProgressSection({
  hours,
  currentSemester,
  studentId,
}: {
  hours: SchemaStudentHoursSummarySchema | undefined;
  currentSemester: SchemaSemesterSchema | undefined;
  studentId?: number | null;
}) {
  const [selfSportModalOpen, setSelfSportModalOpen] = useState(false);
  const required = hours?.required_hours ?? currentSemester?.required_hours;

  const { data: betterThanInfo } = $sport.useQuery(
    "get",
    "/students/{student_id}/better-than",
    { params: { path: { student_id: Number(studentId) } } },
    { enabled: studentId != null },
  );

  const earned =
    hours != null ? hours.hours_from_groups + hours.self_sport_hours : 0;
  const earnedPct =
    hours != null && required != null
      ? Math.min(100, (earned / required) * 100)
      : 0;
  const remaining =
    hours != null && required != null ? Math.max(0, required - earned) : 0;
  const deadline = currentSemester?.end ? new Date(currentSemester.end) : null;
  const daysLeft =
    deadline != null
      ? Math.max(
          0,
          Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;
  const betterThan =
    betterThanInfo != null && betterThanInfo.better_than >= 30
      ? betterThanInfo.better_than
      : null;

  return (
    <div className="flex flex-col gap-6">
      {hours && required != null ? (
        <div className="flex flex-col gap-4">
          {betterThan != null ? (
            <p className="text-base-content/80 text-center text-sm">
              You are better than{" "}
              <span className="text-base-content font-semibold">
                {betterThan}%
              </span>{" "}
              of the students!
            </p>
          ) : null}
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
              more and pass fitness test.
            </p>
          ) : null}
          {deadline != null && daysLeft != null ? (
            <p className="text-base-content/75 text-center text-sm">
              Deadline:{" "}
              <span className="text-base-content font-semibold">
                {deadline.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>{" "}
              ({daysLeft} days left)
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
            <Link to="/sport/profile" className="btn btn-outline btn-sm">
              Medical leave
            </Link>
          </div>
        </div>
      ) : null}

      <SelfSportUploadModal
        open={selfSportModalOpen}
        onOpenChange={setSelfSportModalOpen}
      />
    </div>
  );
}

export function SportIdentityInfo({
  roleLabels,
  enrollmentStatus,
  medicalGroup,
  onChangeMedicalGroup,
}: {
  roleLabels: string[];
  enrollmentStatus?: string | null;
  medicalGroup?: string | null;
  onChangeMedicalGroup: () => void;
}) {
  if (roleLabels.length === 0 && !enrollmentStatus && !medicalGroup) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {roleLabels.length > 0 ? (
        <p className="text-base-content/75 text-sm">
          Status:{" "}
          <span className="text-base-content font-semibold">
            {roleLabels.join(", ")}
          </span>
        </p>
      ) : null}
      {enrollmentStatus ? (
        <p className="text-base-content/75 text-sm">
          Student status:{" "}
          <span className="text-base-content font-semibold">
            {enrollmentStatus}
          </span>
        </p>
      ) : null}
      {medicalGroup ? (
        <p className="text-base-content/75 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Medical group:{" "}
            <span className="text-base-content font-semibold">
              {medicalGroup}
            </span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onChangeMedicalGroup}
          >
            Change
          </button>
        </p>
      ) : null}
    </div>
  );
}

function SelfSportUploadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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

export function MedicalGroupUploadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const { data: medicalGroups } = $sport.useQuery(
    "get",
    "/medical-groups",
    {},
    { enabled: open },
  );
  const { mutate, isPending } = $sport.useMutation(
    "post",
    "/references/medical-group",
    {
      onSuccess: () => {
        showSuccess("Submitted", "Medical group change request was submitted.");
        setFiles([]);
        setComment("");
        onOpenChange(false);
      },
      onError: () => {
        showError("Error", "Failed to submit medical group change request.");
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
      body: formData as any,
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Change Medical Group">
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          Please submit an image of the reference document (e.g. a medical
          certificate) that supports your request to change medical group.
        </p>

        {medicalGroups && medicalGroups.length > 0 ? (
          <div className="bg-base-300 rounded-box p-3 text-sm">
            <p className="text-base-content/70 mb-1 font-semibold">
              Available medical groups
            </p>
            <ul className="flex flex-col gap-1">
              {medicalGroups.map((group) => (
                <li key={group.id}>
                  <span className="font-medium">{group.name}</span>
                  {group.description ? ` — ${group.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <input
          type="file"
          accept="image/*"
          multiple
          className="file-input file-input-bordered w-full"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />

        <textarea
          className="textarea textarea-bordered min-h-20 w-full"
          placeholder="Leave comments here (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <div className="flex justify-end gap-2">
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

export function MedicalReferenceUploadModal({
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
      body: formData as any,
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
