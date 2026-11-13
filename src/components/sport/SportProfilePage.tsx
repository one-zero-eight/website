import { $sport } from "@/api/sport";
import type {
  SchemaMedicalLeaveReferenceSchema,
  SchemaSelfSportReportSchema,
} from "@/api/sport/types.ts";
import { Trans, Plural, useLingui } from "@lingui/react/macro";
import {
  MedicalGroupUploadModal,
  MedicalReferenceUploadModal,
  SelfSportUploadModal,
  SportIdentityInfo,
} from "@/components/sport/SportOverviewSection.tsx";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { useMemo, useState } from "react";

export function SportProfilePage() {
  const { t } = useLingui();
  const { profile, isCollege, isTrainer, studentStatus } = useSportProfile();
  const [medicalGroupModalOpen, setMedicalGroupModalOpen] = useState(false);
  const [medicalReferenceModalOpen, setMedicalReferenceModalOpen] =
    useState(false);
  const [selfSportModalOpen, setSelfSportModalOpen] = useState(false);

  const roleLabels = [
    profile?.student_info ? (isCollege ? t`College` : t`Student`) : null,
    isTrainer ? t`Trainer` : null,
  ].filter((label): label is string => !!label);
  const { data: courseCurators } = $sport.useQuery(
    "get",
    "/info/curators",
    {},
    { enabled: !!profile?.student_info },
  );
  const course = profile?.student_info?.course;
  const courseCurator = courseCurators?.find(
    (curator) => curator.course === course,
  );

  return (
    <div className="flex flex-col gap-4">
      {profile?.full_name ? (
        <h3 className="text-2xl font-medium">{profile.full_name}</h3>
      ) : null}
      <SportIdentityInfo
        roleLabels={roleLabels}
        course={course}
        studentStatus={studentStatus}
        medicalGroup={profile?.student_info?.medical_group}
        onChangeMedicalGroup={() => setMedicalGroupModalOpen(true)}
        curatorName={courseCurator?.curator_name}
        curatorTelegram={courseCurator?.curator_telegram}
      />
      {profile?.student_info ? (
        <SportProfileHistory
          studentId={profile.user_id}
          medicalGroup={profile.student_info.medical_group}
          onChangeMedicalGroup={() => setMedicalGroupModalOpen(true)}
          onSubmitMedicalLeave={() => setMedicalReferenceModalOpen(true)}
          onUploadSelfSport={() => setSelfSportModalOpen(true)}
        />
      ) : null}
      <MedicalGroupUploadModal
        open={medicalGroupModalOpen}
        onOpenChange={setMedicalGroupModalOpen}
      />
      <MedicalReferenceUploadModal
        open={medicalReferenceModalOpen}
        onOpenChange={setMedicalReferenceModalOpen}
      />
      <SelfSportUploadModal
        open={selfSportModalOpen}
        onOpenChange={setSelfSportModalOpen}
      />
    </div>
  );
}

function SportProfileHistory({
  studentId,
  medicalGroup,
  onChangeMedicalGroup,
  onSubmitMedicalLeave,
  onUploadSelfSport,
}: {
  studentId: number;
  medicalGroup: string;
  onChangeMedicalGroup: () => void;
  onSubmitMedicalLeave: () => void;
  onUploadSelfSport: () => void;
}) {
  const { i18n } = useLingui();
  const {
    data: medicalGroupReferences,
    isPending: medicalGroupReferencesPending,
    isError: medicalGroupReferencesError,
  } = $sport.useQuery("get", "/references/medical-group");
  const {
    data: medicalGroupHistory,
    isPending: medicalGroupHistoryPending,
    isError: medicalGroupHistoryError,
  } = $sport.useQuery("get", "/medical-group-history");
  const {
    data: medicalLeaveReferences,
    isPending: medicalLeaveReferencesPending,
    isError: medicalLeaveReferencesError,
  } = $sport.useQuery("get", "/references/medical-leave");
  const {
    data: selfSportReports,
    isPending: selfSportReportsPending,
    isError: selfSportReportsError,
  } = $sport.useQuery("get", "/self-sport/reports", {
    params: { query: { student_id: studentId } },
  });

  const pendingMedicalGroupRequest = medicalGroupReferences?.find((request) =>
    isInReview(request.status),
  );
  const pendingRequestInfo = pendingMedicalGroupRequest
    ? {
        uploadedAt: formatDateTime(
          pendingMedicalGroupRequest.uploaded,
          i18n.locale,
        ),
        comment: pendingMedicalGroupRequest.comment,
      }
    : null;
  const currentMedicalGroupEntry = medicalGroupHistory?.find(
    (entry) => entry.medical_group_name === medicalGroup,
  );
  const previousMedicalGroups = medicalGroupHistory?.filter(
    (entry) => entry.id !== currentMedicalGroupEntry?.id,
  );
  const medicalLeaveBySemester = useMemo(() => {
    const semesters = new Map<
      number,
      {
        id: number;
        name: string;
        references: SchemaMedicalLeaveReferenceSchema[];
      }
    >();

    for (const reference of medicalLeaveReferences ?? []) {
      const semester = semesters.get(reference.semester_id);
      if (semester) {
        semester.references.push(reference);
      } else {
        semesters.set(reference.semester_id, {
          id: reference.semester_id,
          name: reference.semester_name,
          references: [reference],
        });
      }
    }

    return [...semesters.values()];
  }, [medicalLeaveReferences]);
  const selfSportBySemester = useMemo(() => {
    const semesters = new Map<
      number,
      {
        id: number;
        name: string;
        reports: SchemaSelfSportReportSchema[];
      }
    >();

    for (const report of selfSportReports ?? []) {
      const semester = semesters.get(report.semester_id);
      if (semester) {
        semester.reports.push(report);
      } else {
        semesters.set(report.semester_id, {
          id: report.semester_id,
          name: report.semester_name,
          reports: [report],
        });
      }
    }

    return [...semesters.values()];
  }, [selfSportReports]);

  return (
    <div className="divide-base-300 border-base-300 divide-y border-t">
      <section className="flex flex-col gap-3 py-6 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-medium">
            <Trans>Medical leave</Trans>
          </h4>
          <button
            type="button"
            className="btn btn-outline btn-sm border-base-content text-base-content hover:bg-base-content hover:text-base-100"
            onClick={onSubmitMedicalLeave}
          >
            <Trans>Submit medical leave</Trans>
          </button>
        </div>
        {medicalLeaveReferencesError ? (
          <p className="text-error text-sm">
            <Trans>Medical leave history could not be loaded.</Trans>
          </p>
        ) : medicalLeaveReferencesPending ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-full" />
          </div>
        ) : !medicalLeaveReferences || medicalLeaveReferences.length === 0 ? (
          <p className="text-base-content/70 text-sm">
            <Trans>No medical leave references yet.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {medicalLeaveBySemester.map((semester) => (
              <div key={semester.id} className="flex flex-col gap-2">
                <h5 className="text-base-content/70 text-sm font-semibold">
                  {semester.name}
                </h5>
                <ul className="divide-base-300 divide-y">
                  {semester.references.map((reference) => (
                    <MedicalLeaveReferenceItem
                      key={reference.id}
                      reference={reference}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 py-6 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-medium">
            <Trans>Medical groups</Trans>
          </h4>
          <button
            type="button"
            className="btn btn-outline btn-sm border-base-content text-base-content hover:bg-base-content hover:text-base-100"
            onClick={onChangeMedicalGroup}
          >
            <Trans>Change Medical Group</Trans>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentMedicalGroupEntry ? (
            <span className="text-base-content/70 text-sm">
              {formatDateTime(currentMedicalGroupEntry.changed, i18n.locale)}
            </span>
          ) : null}
          <span className="font-medium">{medicalGroup}</span>
        </div>
        {pendingRequestInfo ? (
          <MedicalGroupRequestAlert
            uploadedAt={pendingRequestInfo.uploadedAt}
            comment={pendingRequestInfo.comment}
          />
        ) : null}
        {medicalGroupReferencesError || medicalGroupHistoryError ? (
          <p className="text-error text-sm">
            <Trans>Medical group history could not be loaded.</Trans>
          </p>
        ) : medicalGroupReferencesPending || medicalGroupHistoryPending ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-full" />
          </div>
        ) : !medicalGroupHistory || medicalGroupHistory.length === 0 ? (
          <p className="text-base-content/70 text-sm">
            <Trans>No medical group changes yet.</Trans>
          </p>
        ) : (
          <ul className="divide-base-300 divide-y">
            {previousMedicalGroups?.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
              >
                <span className="text-base-content/70 text-sm">
                  {formatDateTime(entry.changed, i18n.locale)}
                </span>
                <span className="font-medium">{entry.medical_group_name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 py-6 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-medium">
            <Trans>Self-sport</Trans>
          </h4>
          <button
            type="button"
            className="btn btn-outline btn-sm border-base-content text-base-content hover:bg-base-content hover:text-base-100"
            onClick={onUploadSelfSport}
          >
            <Trans>Upload self-sport</Trans>
          </button>
        </div>
        {selfSportReportsError ? (
          <p className="text-error text-sm">
            <Trans>Self-sport reports could not be loaded.</Trans>
          </p>
        ) : selfSportReportsPending ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-full" />
          </div>
        ) : !selfSportReports || selfSportReports.length === 0 ? (
          <p className="text-base-content/70 text-sm">
            <Trans>No self-sport reports yet.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {selfSportBySemester.map((semester) => (
              <div key={semester.id} className="flex flex-col gap-2">
                <h5 className="text-base-content/70 text-sm font-semibold">
                  {semester.name}
                </h5>
                <ul className="divide-base-300 divide-y">
                  {semester.reports.map((report) => (
                    <SelfSportReportItem key={report.id} report={report} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MedicalGroupRequestAlert({
  uploadedAt,
  comment,
}: {
  uploadedAt: string;
  comment: string | null;
}) {
  return (
    <div className="alert alert-warning items-start py-2">
      <span className="icon-[material-symbols--hourglass-top] mt-0.5 shrink-0 text-xl" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">
          <Trans>Medical group change request · In review</Trans>
        </p>
        <p className="text-sm">
          <Trans>Submitted on {uploadedAt}</Trans>
        </p>
        {comment ? (
          <p className="text-sm">
            <span className="font-medium">
              <Trans>Admin comment:</Trans>
            </span>{" "}
            {comment}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MedicalLeaveReferenceItem({
  reference,
}: {
  reference: SchemaMedicalLeaveReferenceSchema;
}) {
  const { i18n } = useLingui();
  const dateRange = formatDateRange(
    reference.start,
    reference.end,
    i18n.locale,
  );
  const uploadedAt = formatDateTime(reference.uploaded, i18n.locale);

  return (
    <li className="flex flex-col gap-1 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{dateRange}</span>
        <ReferenceStatusBadge status={reference.status} />
      </div>
      <p className="text-base-content/70 flex flex-wrap gap-x-1">
        <Plural value={reference.hours} one="# hour" other="# hours" />
        <span>·</span>
        <Trans>uploaded {uploadedAt}</Trans>
      </p>
      {reference.student_comment ? (
        <p className="text-base-content/70 italic">
          “{reference.student_comment}”
        </p>
      ) : null}
      {reference.comment ? (
        <p className="text-base-content/70">
          <span className="font-medium">
            <Trans>Admin comment:</Trans>
          </span>{" "}
          {reference.comment}
        </p>
      ) : null}
    </li>
  );
}

function SelfSportReportItem({
  report,
}: {
  report: SchemaSelfSportReportSchema;
}) {
  const { i18n } = useLingui();
  const uploadedAt = formatDateTime(report.uploaded, i18n.locale);

  return (
    <li className="flex flex-col gap-1 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base-content/70">{uploadedAt}</span>
        <span className="font-medium">
          {report.training_type_name ?? <Trans>Self-sport</Trans>}
        </span>
        <ReferenceStatusBadge status={getApprovalStatus(report.approval)} />
      </div>
      <p className="text-base-content/70">
        <Plural value={report.hours} one="# hour" other="# hours" />
      </p>
      {report.link ? (
        <p className="text-base-content/70 break-all">
          <Trans>Link</Trans>:{" "}
          <a
            href={report.link}
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
          >
            {report.link}
          </a>
        </p>
      ) : null}
      {report.student_comment ? (
        <p className="text-base-content/70 italic">
          “{report.student_comment}”
        </p>
      ) : null}
      {report.comment ? (
        <p className="text-base-content/70">
          <span className="font-medium">
            <Trans>Admin comment:</Trans>
          </span>{" "}
          {report.comment}
        </p>
      ) : null}
    </li>
  );
}

function ReferenceStatusBadge({ status }: { status: string }) {
  const { badgeClass, label } = getStatusPresentation(status);

  return <span className={`badge badge-sm ${badgeClass}`}>{label}</span>;
}

function getStatusPresentation(status: string) {
  if (isInReview(status)) {
    return {
      badgeClass: "badge-warning",
      label: <Trans>In review</Trans>,
    };
  }
  if (status === "approved") {
    return {
      badgeClass: "badge-success",
      label: <Trans>Approved</Trans>,
    };
  }
  return {
    badgeClass: "badge-error",
    label: <Trans>Rejected</Trans>,
  };
}

function getApprovalStatus(approval: boolean | null): string {
  if (approval == null) return "in_review";
  return approval ? "approved" : "rejected";
}

function isInReview(status: string): boolean {
  return status === "in_review";
}

function formatDateRange(start: string, end: string, locale: string): string {
  return `${formatDateOnly(start, locale)} – ${formatDateOnly(end, locale)}`;
}

function formatDateOnly(value: string, locale: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}
