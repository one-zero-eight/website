import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { SportTrainerBaamImportButton } from "@/components/sport/SportTrainerBaamImportButton.tsx";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import {
  SportTrainerAttendanceRow,
  SportTrainerStudentAddField,
} from "@/components/sport/SportTrainerTrainingModal.tsx";
import {
  handleAttendanceResponse,
  invalidateAttendance,
} from "@/components/sport/sport-trainer-utils.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export function SportTrainerAttendanceModal({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemaTrainingInfoPersonalSchema;
}) {
  const trainingId = row.training.id;
  const groupId = row.training.group_id;

  const queryClient = useQueryClient();
  const { showError, showSuccess, showWarning } = useToast();
  const [importing, setImporting] = useState(false);

  const {
    data: attendance,
    isPending: attendancePending,
    isError: attendanceError,
  } = $sport.useQuery(
    "get",
    "/trainings/{training_id}/attendance",
    { params: { path: { training_id: trainingId } } },
    { enabled: open },
  );

  const sortedGrades = useMemo(() => {
    return [...(attendance?.grades ?? [])].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`,
        undefined,
        { sensitivity: "base" },
      ),
    );
  }, [attendance?.grades]);

  const { mutate: markAttendance, isPending: markPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/attendance",
    {
      onSuccess: (data) => {
        handleAttendanceResponse(data, showSuccess, showWarning);
        invalidateAttendance(queryClient, trainingId);
      },
      onError: () => {
        showError("Could not update attendance", "Please try again.");
      },
    },
  );

  function handleStudentHours(studentId: number, hours: number) {
    const grade = sortedGrades.find((item) => item.id === studentId);
    if (grade?.hours === hours) {
      return;
    }

    markAttendance({
      params: { path: { training_id: trainingId } },
      body: {
        training_id: trainingId,
        students_hours: [{ student_id: studentId, hours }],
      },
    });
  }

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={sportTrainingTitle(row) + " (Trainer)"}
      closeDisabled={importing}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <SportTrainerStudentAddField
          open={open}
          trainingId={trainingId}
          groupId={groupId}
        />

        <SportTrainerBaamImportButton
          trainingId={trainingId}
          groupId={groupId}
          onImportingChange={setImporting}
        />

        {attendancePending ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : attendanceError ? (
          <div className="alert alert-error">
            Attendance list could not be loaded.
          </div>
        ) : sortedGrades.length ? (
          <ul className="flex flex-col gap-2">
            {sortedGrades.map((grade) => (
              <SportTrainerAttendanceRow
                key={grade.id}
                grade={grade}
                disabled={markPending || importing}
                onHoursChange={handleStudentHours}
              />
            ))}
          </ul>
        ) : (
          <div className="text-base-content/60 text-sm">No attendees yet.</div>
        )}
      </div>

      <div className="border-t-base-300 flex shrink-0 flex-wrap gap-2 border-t p-4">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={importing}
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    </SportTrainingModalShell>
  );
}
