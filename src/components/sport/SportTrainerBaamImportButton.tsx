import { $sport } from "@/api/sport";
import {
  invalidateAttendance,
  sportTrainerMenuBtn,
} from "@/components/sport/sport-trainer-utils.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

/**
 * Imports attendance from a BAAM .txt export: one student email per line.
 * Each email is resolved via suggest-student and marked with 2 hours.
 */
export function SportTrainerBaamImportButton({
  trainingId,
  groupId,
  onImportingChange,
}: {
  trainingId: number;
  groupId: number;
  onImportingChange?: (importing: boolean) => void;
}) {
  const queryClient = useQueryClient();
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
    const failed: string[] = [];
    let marked = 0;

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
            students_hours: [{ student_id: match.id, hours: 2 }],
          },
        });

        if (Array.isArray(result)) {
          marked += 1;
        } else {
          failed.push(`${email} (${result.description})`);
        }
      } catch {
        failed.push(email);
      } finally {
        setImportProgress((progress) =>
          progress ? { ...progress, done: progress.done + 1 } : progress,
        );
      }
    }

    setImportProgress(null);
    onImportingChange?.(false);
    invalidateAttendance(queryClient, trainingId);

    if (marked > 0) {
      showSuccess(
        "Attendance imported",
        `Marked 2h for ${marked} student${marked === 1 ? "" : "s"}.`,
      );
    }
    if (notFound.length > 0) {
      showWarning("Students not found", notFound.join(", "));
    }
    if (failed.length > 0) {
      showError("Could not mark attendance", failed.join(", "));
    }
  }

  async function handleFileSelected(file: File) {
    const text = await file.text();
    const emails = parseEmails(text);

    if (!emails.length) {
      showWarning("Nothing to import", "The file contains no student emails.");
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
        className={cn(sportTrainerMenuBtn, "w-full")}
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        {importing ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Importing {importProgress.done} / {importProgress.total}
          </>
        ) : (
          "Load from baam"
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
