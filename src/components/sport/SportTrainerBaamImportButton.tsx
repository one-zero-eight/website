import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { i18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { $sport } from "@/api/sport";
import { queryClient } from "@/app/query-client.ts";
import {
  invalidateAttendance,
  sportTrainerMenuBtn,
} from "@/components/sport/sport-trainer-utils.ts";
import { useToast, type ToastText } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useRef, useState } from "react";

/**
 * Imports attendance from a BAAM .txt export: one student email per line.
 * Each email is resolved via suggest-student and marked with the training's academic duration.
 */
export function SportTrainerBaamImportButton({
  trainingId,
  groupId,
  maxHours,
  onImportingChange,
}: {
  trainingId: number;
  groupId: number;
  maxHours: number | undefined;
  onImportingChange?: (importing: boolean) => void;
}) {
  const { showError, showSuccess, showWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const { mutateAsync: markAttendanceAsync } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/attendance",
  );

  const importing = importProgress != null;

  async function importEmails(emails: string[]) {
    const notFound: string[] = [];
    const failed: { email: string; error: ToastText }[] = [];
    let marked = 0;
    const hours = maxHours;
    if (hours == null || hours <= 0) {
      showError(
        msg`Could not import attendance`,
        msg`Training duration is unavailable.`,
      );
      return;
    }

    onImportingChange?.(true);
    setImportProgress({ done: 0, total: emails.length });

    for (const email of emails) {
      try {
        const localPart = email.split("@")[0] ?? "";
        const surname = localPart.split(".").pop() ?? localPart;

        const suggestions = await queryClient.fetchQuery(
          $sport.queryOptions(
            "get",
            "/trainings/{training_id}/suggest-student",
            {
              params: {
                path: { training_id: trainingId },
                query: { term: surname, group_id: groupId },
              },
            },
          ),
        );

        const match = suggestions.find(
          (student) => student.email.toLowerCase() === email.toLowerCase(),
        );

        if (!match) {
          notFound.push(email);
          continue;
        }

        const result = await markAttendanceAsync({
          params: { path: { training_id: trainingId } },
          body: {
            training_id: trainingId,
            students_hours: [{ student_id: match.id, hours }],
          },
        });

        if (Array.isArray(result)) {
          marked += 1;
        } else {
          failed.push({ email, error: result.description });
        }
      } catch (error) {
        failed.push({ email, error: formatApiErrorDescriptor(error) });
      } finally {
        setImportProgress((progress) =>
          progress ? { ...progress, done: progress.done + 1 } : progress,
        );
      }
    }

    setImportProgress(null);
    onImportingChange?.(false);
    invalidateAttendance(trainingId);

    if (marked > 0) {
      showSuccess(
        msg`Attendance imported`,
        msg`Marked ${hours}h for ${plural(marked, { one: "# student", other: "# students" })}.`,
      );
    }
    if (notFound.length > 0) {
      showWarning(msg`Students not found`, notFound.join(", "));
    }
    if (failed.length > 0) {
      showError(msg`Could not mark attendance`, {
        ...msg`Failed: ${{ failed: "" }}`,
        values: {
          // Resolve stored descriptors each time the toast renders after a locale change.
          get failed() {
            return failed
              .map(
                ({ email, error }) =>
                  `${email} (${typeof error === "string" ? error : i18n._(error)})`,
              )
              .join(", ");
          },
        },
      });
    }
  }

  async function handleFileSelected(file: File) {
    const text = await file.text();
    const emails = parseEmails(text);

    if (!emails.length) {
      showWarning(
        msg`Nothing to import`,
        msg`The file contains no student emails.`,
      );
      return;
    }

    await importEmails(emails);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) {
            void handleFileSelected(file);
          }
        }}
      />
      <button
        type="button"
        className={cn(sportTrainerMenuBtn, "btn-sm")}
        disabled={importing || maxHours == null || maxHours <= 0}
        onClick={() => fileInputRef.current?.click()}
      >
        {importing ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            <Trans>
              Importing {importProgress.done} / {importProgress.total}
            </Trans>
          </>
        ) : (
          <Trans>Load from Baam</Trans>
        )}
      </button>
    </>
  );
}

function parseEmails(text: string): string[] {
  const emails = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.includes("@"));

  return [...new Set(emails.map((email) => email.toLowerCase()))];
}
