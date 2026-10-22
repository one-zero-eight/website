import { $sport } from "@/api/sport";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { msg, plural } from "@lingui/core/macro";
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
  const { i18n, t } = useLingui();
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
  const debt = hours?.debt ?? 0;
  const totalRequired = (required ?? 0) + debt;
  const selfSportPct =
    totalRequired > 0
      ? Math.min(100, ((hours?.self_sport_hours ?? 0) / totalRequired) * 100)
      : 0;
  const regularSportPct =
    totalRequired > 0
      ? Math.min(
          100 - selfSportPct,
          ((hours?.hours_from_groups ?? 0) / totalRequired) * 100,
        )
      : 0;
  const debtPct = totalRequired > 0 ? (debt / totalRequired) * 100 : 0;
  const remaining = Math.max(0, totalRequired - earned);
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
              <Trans>
                You are better than{" "}
                <span className="text-base-content font-semibold">
                  {betterThan}%
                </span>{" "}
                of the students!
              </Trans>
            </p>
          ) : null}
          <p className="text-base-content/80 text-center text-sm">
            {debt > 0
              ? t`Current sport hours: ${earned} out of ${required} + ${debt} (debt) ${plural(totalRequired, { one: "hour", other: "hours" })}`
              : t`Current sport hours: ${earned} out of ${plural(required, { one: "# hour", other: "# hours" })}`}
          </p>
          <div className="bg-base-200 mx-auto w-full max-w-xl overflow-hidden rounded-lg">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-2 text-xs font-semibold">
              {debt > 0 ? (
                <span className="text-error">{t`Debt (${debt}h)`}</span>
              ) : null}
              <span className="text-info">
                {t`Regular sport (${hours.hours_from_groups}h)`}
              </span>
              <span className="text-primary">
                {t`Self-sport (${hours.self_sport_hours}h)`}
              </span>
            </div>
            <div className="bg-base-300 relative flex h-8 w-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${selfSportPct}%` }}
                title={t`Self-sport: ${hours.self_sport_hours}h`}
              />
              <div
                className="bg-info h-full"
                style={{ width: `${regularSportPct}%` }}
                title={t`Regular sport: ${hours.hours_from_groups}h`}
              />
              {debt > 0 ? (
                <div
                  className="bg-error/25 absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,transparent_0_8px,var(--color-error)_8px_10px)] opacity-50"
                  style={{ width: `${debtPct}%` }}
                  title={t`Debt: ${debt}h`}
                />
              ) : null}
            </div>
          </div>
          {remaining > 0 ? (
            <p className="text-base-content/75 text-center text-sm">
              <Trans>
                To pass the sport course you must get{" "}
                <span className="text-base-content font-semibold">
                  <Plural value={remaining} one="# hour" other="# hours" />
                </span>{" "}
                more and pass fitness test.
              </Trans>
            </p>
          ) : null}
          {deadline != null && daysLeft != null ? (
            <p className="text-base-content/75 text-center text-sm">
              <Trans>Deadline:</Trans>{" "}
              <span className="text-base-content font-semibold">
                {deadline.toLocaleDateString(i18n.locale, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>{" "}
              {t`(${plural(daysLeft, {
                one: "# day left",
                other: "# days left",
              })})`}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelfSportModalOpen(true)}
            >
              <Trans>Self-sport upload</Trans>
            </button>
            <Link to="/sport/profile" className="btn btn-outline btn-sm">
              <Trans>Medical leave</Trans>
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
          <Trans>
            Status:{" "}
            <span className="text-base-content font-semibold">
              {roleLabels.join(", ")}
            </span>
          </Trans>
        </p>
      ) : null}
      {enrollmentStatus ? (
        <p className="text-base-content/75 text-sm">
          <Trans>
            Student status:{" "}
            <span className="text-base-content font-semibold">
              {enrollmentStatus}
            </span>
          </Trans>
        </p>
      ) : null}
      {medicalGroup ? (
        <p className="text-base-content/75 flex flex-wrap items-center gap-2 text-sm">
          <span>
            <Trans>
              Medical group:{" "}
              <span className="text-base-content font-semibold">
                {medicalGroup}
              </span>
            </Trans>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onChangeMedicalGroup}
          >
            <Trans>Change</Trans>
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
  const { t } = useLingui();
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
        showSuccess(msg`Submitted`, msg`Self-sport report was submitted.`);
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
        showError(msg`Error`, msg`Failed to submit self-sport report.`);
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
    <Modal open={open} onOpenChange={onOpenChange} title={t`Self Sport Upload`}>
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          <Trans>
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
          </Trans>
        </p>

        <div className="alert alert-info justify-center py-2 text-sm">
          <span>
            <Trans>
              Checking your workouts{" "}
              <span className="font-semibold">can take up to 2 weeks.</span>
            </Trans>
          </span>
        </div>

        <select
          className="select select-bordered w-full"
          value={trainingTypeId}
          disabled={trainingTypesPending}
          onChange={(event) => setTrainingTypeId(event.target.value)}
        >
          <option value="">
            <Trans>Select your training type</Trans>
          </option>
          {trainingTypes?.map((trainingType) => (
            <option key={trainingType.id} value={trainingType.id}>
              {trainingType.name}
            </option>
          ))}
        </select>
        {trainingTypesError ? (
          <p className="text-error text-sm">
            <Trans>Training types could not be loaded.</Trans>
          </p>
        ) : null}

        <input
          type="url"
          className="input input-bordered w-full"
          placeholder={t`Activity link`}
          value={activityLink}
          onBlur={handleActivityLinkBlur}
          onChange={(event) => {
            setActivityLink(event.target.value);
            setParsedData(null);
            setHours("");
          }}
        />

        <p className="text-base-content/80 text-sm">
          <Trans>
            System{" "}
            <span className="text-base-content font-semibold">
              automatically set the number of hours
            </span>{" "}
            you have accumulated during the training.{" "}
            <span className="italic">Change it if something went wrong.</span>
          </Trans>
        </p>

        <input
          type="number"
          min="0"
          step="0.5"
          className="input input-bordered w-full"
          placeholder={
            parseActivityFetching
              ? t`Parsing activity link`
              : t`Waiting for the activity link`
          }
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />

        <textarea
          className="textarea textarea-bordered min-h-20 w-full"
          placeholder={t`Leave comments here (optional)`}
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
            <Trans>Submit</Trans>
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
  const { t } = useLingui();
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
        showSuccess(
          msg`Submitted`,
          msg`Medical group change request was submitted.`,
        );
        setFiles([]);
        setComment("");
        onOpenChange(false);
      },
      onError: () => {
        showError(
          msg`Error`,
          msg`Failed to submit medical group change request.`,
        );
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t`Change Medical Group`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          <Trans>
            Please submit an image of the reference document (e.g. a medical
            certificate) that supports your request to change medical group.
          </Trans>
        </p>

        {medicalGroups && medicalGroups.length > 0 ? (
          <div className="bg-base-300 rounded-box p-3 text-sm">
            <p className="text-base-content/70 mb-1 font-semibold">
              <Trans>Available medical groups</Trans>
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
          placeholder={t`Leave comments here (optional)`}
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
            <Trans>Submit</Trans>
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
  const { t } = useLingui();
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
        showSuccess(
          msg`Submitted`,
          msg`Medical leave reference was submitted.`,
        );
        setFile(null);
        setStartDate("");
        setEndDate("");
        setComment("");
        onOpenChange(false);
      },
      onError: () => {
        showError(msg`Error`, msg`Failed to submit medical leave reference.`);
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
      title={t`Medical Reference Submission`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-base-content/80 text-sm">
          <Trans>
            Please submit an image of the medical reference. Specify the range
            of dates (illness period) and leave comments if necessary.
          </Trans>
        </p>

        <div className="border-base-300 border-t pt-4">
          <p className="text-base-content/80 text-sm">
            <Trans>
              The{" "}
              <span className="text-base-content font-semibold">
                week missed
              </span>{" "}
              due to illness is{" "}
              <span className="text-base-content font-semibold">
                compensated by two sports hours.
              </span>
            </Trans>
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
            <span className="label-text text-center text-sm">
              <Trans>Start date</Trans>
            </span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="form-control gap-1">
            <span className="label-text text-center text-sm">
              <Trans>End date</Trans>
            </span>
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
          placeholder={t`Leave comments here (optional)`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <div className="flex justify-between gap-2">
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => onOpenChange(false)}
          >
            <Trans>Close</Trans>
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
            <Trans>Submit</Trans>
          </button>
        </div>
      </div>
    </Modal>
  );
}
