import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $sport } from "@/api/sport";
import type {
  SchemaAttendanceStudentGradeSchema,
  SchemaAttendanceSuggestionSchema,
  SchemaTrainingInfoPersonalSchema,
} from "@/api/sport/types.ts";
import { SportTrainerBaamImportButton } from "@/components/sport/SportTrainerBaamImportButton.tsx";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import {
  formatStudentName,
  handleAttendanceResponse,
  invalidateAttendance,
  sportTrainerMenuBtn,
  sportTrainerMenuBtnActive,
} from "@/components/sport/sport-trainer-utils.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainerModalView = "main" | "attendees";
const HOLD_ALL_ZERO_MS = 3000;

export function SportTrainerTrainingModal({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemaTrainingInfoPersonalSchema;
}) {
  const [view, setView] = useState<TrainerModalView>("main");

  useEffect(() => {
    if (!open) {
      setView("main");
    }
  }, [open]);

  const title = sportTrainingTitle(row) + " (Trainer)";
  const [importing, setImporting] = useState(false);
  const { data: attendance } = $sport.useQuery(
    "get",
    "/trainings/{training_id}/attendance",
    { params: { path: { training_id: row.training.id } } },
    { enabled: open && view === "attendees" },
  );

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeDisabled={importing}
      onBack={view === "attendees" ? () => setView("main") : undefined}
    >
      {view === "main" ? (
        <SportTrainerTrainingModalMain
          open={open}
          trainingId={row.training.id}
          groupId={row.training.group_id}
          canEdit={row.can_edit}
          onViewAttendees={() => setView("attendees")}
        />
      ) : (
        <SportTrainerTrainingModalAttendees
          open={open}
          trainingId={row.training.id}
          groupId={row.training.group_id}
          canEdit={row.can_edit}
          importing={importing}
        />
      )}

      <div className="border-t-base-300 flex shrink-0 flex-wrap items-center gap-2 border-t p-4">
        <button
          type="button"
          className={cn(
            "btn btn-ghost",
            "active:border active:border-[#8D4CF6] active:text-[#8D4CF6]",
          )}
          disabled={importing}
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
        {view === "attendees" && row.can_edit ? (
          <SportTrainerBaamImportButton
            trainingId={row.training.id}
            groupId={row.training.group_id}
            maxHours={attendance?.academic_duration}
            onImportingChange={setImporting}
          />
        ) : null}
      </div>
    </SportTrainingModalShell>
  );
}

function SportTrainerTrainingModalMain({
  open,
  trainingId,
  groupId,
  canEdit,
  onViewAttendees,
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
  canEdit: boolean;
  onViewAttendees: () => void;
}) {
  const { data: attendance } = $sport.useQuery(
    "get",
    "/trainings/{training_id}/attendance",
    { params: { path: { training_id: trainingId } } },
    { enabled: open && canEdit },
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      {canEdit ? (
        <SportTrainerStudentAddField
          open={open}
          trainingId={trainingId}
          groupId={groupId}
          maxHours={attendance?.academic_duration}
        />
      ) : null}

      <button
        type="button"
        className={cn(sportTrainerMenuBtn, "w-full")}
        onClick={onViewAttendees}
      >
        View attendee
      </button>
    </div>
  );
}

function SportTrainerTrainingModalAttendees({
  open,
  trainingId,
  groupId,
  canEdit,
  importing,
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
  canEdit: boolean;
  importing: boolean;
}) {
  const { showError, showSuccess, showWarning } = useToast();
  const [hoursFilter, setHoursFilter] = useState<Set<number> | null>(null);
  const [holdHintVisible, setHoldHintVisible] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setHoursFilter(null);
      setHoldHintVisible(false);
      clearHoldTimer();
      clearHoldHintTimer();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearHoldHintTimer();
    };
  }, []);

  const {
    data: attendance,
    isPending,
    isError,
  } = $sport.useQuery(
    "get",
    "/trainings/{training_id}/attendance",
    { params: { path: { training_id: trainingId } } },
    { enabled: open },
  );

  const { mutate: markAttendance, isPending: markPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/attendance",
    {
      onSuccess: (data) => {
        handleAttendanceResponse(data, showSuccess, showWarning);
        invalidateAttendance(trainingId);
      },
      onError: (error) => {
        showError("Could not update attendance", formatApiErrorMessage(error));
      },
    },
  );

  const sortedGrades = useMemo(() => {
    return [...(attendance?.grades ?? [])].sort((a, b) =>
      formatStudentName(a).localeCompare(formatStudentName(b), undefined, {
        sensitivity: "base",
      }),
    );
  }, [attendance?.grades]);

  const hourOptions = useMemo(() => {
    const maxHours = attendance?.academic_duration ?? 0;
    const existingHours = sortedGrades.map((grade) => grade.hours);
    return [...new Set([0, 1, 2, maxHours, ...existingHours])]
      .filter((hours) => hours <= maxHours || existingHours.includes(hours))
      .sort((a, b) => a - b);
  }, [attendance?.academic_duration, sortedGrades]);
  const filteredGrades = useMemo(() => {
    return sortedGrades.filter((grade) =>
      hoursFilter ? hoursFilter.has(grade.hours) : true,
    );
  }, [hoursFilter, sortedGrades]);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearHoldHintTimer() {
    if (holdHintTimerRef.current) {
      clearTimeout(holdHintTimerRef.current);
      holdHintTimerRef.current = null;
    }
  }

  function showHoldHint() {
    setHoldHintVisible(true);
    clearHoldHintTimer();
    holdHintTimerRef.current = setTimeout(() => {
      setHoldHintVisible(false);
      holdHintTimerRef.current = null;
    }, 2500);
  }

  function markHours(studentsHours: { student_id: number; hours: number }[]) {
    markAttendance({
      params: { path: { training_id: trainingId } },
      body: { training_id: trainingId, students_hours: studentsHours },
    });
  }

  function handleStudentHours(studentId: number, hours: number) {
    const grade = sortedGrades.find((item) => item.id === studentId);
    if (!canEdit || !grade || grade.hours === hours) {
      return;
    }

    markHours([{ student_id: studentId, hours }]);
  }

  function handleAllHours(hours: number) {
    if (!canEdit || !sortedGrades.length) {
      return;
    }

    const gradesToUpdate = sortedGrades
      .filter((grade) => (hours === 0 ? grade.hours !== 0 : grade.hours === 0))
      .map((grade) => ({ student_id: grade.id, hours }));
    if (gradesToUpdate.length) {
      markHours(gradesToUpdate);
    }
  }

  function handleAllZeroHoldStart() {
    if (!canEdit || !sortedGrades.length || markPending || importing) {
      return;
    }

    setHoldHintVisible(false);
    clearHoldHintTimer();
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setHoldHintVisible(false);
      handleAllHours(0);
    }, HOLD_ALL_ZERO_MS);
  }

  function handleAllZeroHoldEnd() {
    if (!holdTimerRef.current) {
      return;
    }

    clearHoldTimer();
    showHoldHint();
  }

  function toggleHoursFilter(hours: number) {
    setHoursFilter((current) => {
      const next = new Set(current ?? hourOptions);
      if (next.has(hours)) {
        if (next.size === 1) {
          return current;
        }
        next.delete(hours);
      } else {
        next.add(hours);
      }
      return next.size === hourOptions.length ? null : next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
      {holdHintVisible ? (
        <div className="text-warning text-center text-sm font-medium">
          hold to set all 0h
        </div>
      ) : null}

      {canEdit ? (
        <SportTrainerStudentAddField
          open={open}
          trainingId={trainingId}
          groupId={groupId}
          maxHours={attendance?.academic_duration}
        />
      ) : (
        <div className="text-warning text-sm">
          You can't change this training.
        </div>
      )}

      {isPending ? (
        <div className="flex flex-col gap-2">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="alert alert-error">
          Attendance list could not be loaded.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(sportTrainerMenuBtn, "btn-sm")}
              disabled={
                !canEdit ||
                !sortedGrades.some((grade) => grade.hours === 0) ||
                markPending ||
                importing ||
                (attendance?.academic_duration ?? 0) <= 0
              }
              onClick={() => handleAllHours(attendance?.academic_duration ?? 0)}
            >
              All {attendance?.academic_duration ?? 0}h
            </button>
            <button
              type="button"
              className={cn(sportTrainerMenuBtn, "btn-sm")}
              disabled={
                !canEdit ||
                !sortedGrades.some((grade) => grade.hours !== 0) ||
                markPending ||
                importing
              }
              onPointerDown={handleAllZeroHoldStart}
              onPointerUp={handleAllZeroHoldEnd}
              onPointerLeave={handleAllZeroHoldEnd}
              onPointerCancel={handleAllZeroHoldEnd}
            >
              All 0h
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {hourOptions.map((hours) => (
              <button
                key={hours}
                type="button"
                className={cn(
                  "btn btn-xs border-2",
                  (hoursFilter?.has(hours) ?? true)
                    ? sportTrainerMenuBtnActive
                    : sportTrainerMenuBtn,
                )}
                onClick={() => toggleHoursFilter(hours)}
              >
                {hours}h
              </button>
            ))}
          </div>

          {filteredGrades.length ? (
            <ul className="divide-base-300 divide-y">
              {filteredGrades.map((grade) => (
                <SportTrainerAttendanceRow
                  key={grade.id}
                  grade={grade}
                  maxHours={attendance?.academic_duration ?? 0}
                  disabled={!canEdit || markPending || importing}
                  onHoursChange={handleStudentHours}
                />
              ))}
            </ul>
          ) : sortedGrades.length ? (
            <div className="text-base-content/60 text-sm">
              No attendees match the selected hour filters.
            </div>
          ) : (
            <div className="text-base-content/60 text-sm">
              No attendees yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SportTrainerStudentAddField({
  open,
  trainingId,
  groupId,
  maxHours,
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
  maxHours?: number;
}) {
  const { showError, showSuccess, showWarning } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<SchemaAttendanceSuggestionSchema | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setSelectedStudent(null);
      setSuggestionsOpen(false);
    }
  }, [open]);

  const trimmedTerm = debouncedSearchTerm.trim();
  const {
    data: suggestions = [],
    isPending: suggestionsPending,
    isError: suggestionsError,
  } = $sport.useQuery(
    "get",
    "/trainings/{training_id}/suggest-student",
    {
      params: {
        path: { training_id: trainingId },
        query: { term: trimmedTerm, group_id: groupId },
      },
    },
    { enabled: open && trimmedTerm.length >= 2 },
  );

  const { mutate: markAttendance, isPending: markPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/attendance",
    {
      onSuccess: (data) => {
        handleAttendanceResponse(data, showSuccess, showWarning);
        invalidateAttendance(trainingId);
        setSelectedStudent(null);
        setSearchTerm("");
        setSuggestionsOpen(false);
      },
      onError: (error) => {
        showError("Could not update attendance", formatApiErrorMessage(error));
      },
    },
  );

  function handleSelectStudent(student: SchemaAttendanceSuggestionSchema) {
    setSelectedStudent(student);
    setSearchTerm(formatStudentName(student));
    setSuggestionsOpen(false);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setSelectedStudent(null);
    setSuggestionsOpen(value.trim().length >= 2);
  }

  function handleAddStudent() {
    if (!selectedStudent || maxHours == null || maxHours <= 0) {
      return;
    }

    markAttendance({
      params: { path: { training_id: trainingId } },
      body: {
        training_id: trainingId,
        students_hours: [{ student_id: selectedStudent.id, hours: maxHours }],
      },
    });
  }

  const showSuggestions =
    suggestionsOpen &&
    trimmedTerm.length >= 2 &&
    !selectedStudent &&
    (suggestionsPending || suggestions.length > 0 || suggestionsError);

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Student name"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchTerm.trim().length >= 2 && !selectedStudent) {
              setSuggestionsOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setSuggestionsOpen(false), 150);
          }}
        />
        {showSuggestions ? (
          <ul className="border-base-300 bg-base-100 rounded-box absolute top-full right-0 left-0 mt-1 max-h-48 overflow-y-auto border shadow-md">
            {suggestionsPending ? (
              <li className="text-base-content/60 px-3 py-2 text-sm">
                <span className="loading loading-spinner loading-sm" />
              </li>
            ) : suggestionsError ? (
              <li className="text-error px-3 py-2 text-sm">
                Suggestions could not be loaded.
              </li>
            ) : suggestions.length ? (
              suggestions.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className="hover:bg-base-200 w-full px-3 py-2 text-left text-sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectStudent(student)}
                  >
                    <div className="font-medium">
                      {formatStudentName(student)}
                    </div>
                    <div className="text-base-content/60 text-xs">
                      {student.email}
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="text-base-content/60 px-3 py-2 text-sm">
                No students found.
              </li>
            )}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className={cn(sportTrainerMenuBtn, "shrink-0")}
        disabled={
          !selectedStudent || markPending || maxHours == null || maxHours <= 0
        }
        onClick={handleAddStudent}
      >
        {markPending ? (
          <span className="loading loading-spinner loading-sm" />
        ) : maxHours == null ? (
          "Add"
        ) : (
          `Add ${maxHours}`
        )}
      </button>
    </div>
  );
}

export function SportTrainerAttendanceRow({
  grade,
  maxHours,
  disabled,
  onHoursChange,
}: {
  grade: SchemaAttendanceStudentGradeSchema;
  maxHours: number;
  disabled: boolean;
  onHoursChange: (studentId: number, hours: number) => void;
}) {
  const hourOptions = [...new Set([0, 1, 2, maxHours, grade.hours])]
    .filter((hours) => hours <= maxHours || hours === grade.hours)
    .sort((a, b) => a - b);

  return (
    <li className="flex flex-col gap-1 py-1.5 @sm/modal:flex-row @sm/modal:items-center @sm/modal:justify-between @sm/modal:gap-2">
      <div className="min-w-0">
        <div className="font-medium wrap-break-word">
          {formatStudentName(grade)}
        </div>
        <div className="text-base-content/60 text-xs wrap-break-word">
          {grade.email}
        </div>
      </div>
      <div className="join shrink-0">
        {hourOptions.map((hours) => (
          <button
            key={hours}
            type="button"
            className={cn(
              "btn btn-xs join-item min-w-9 border-2",
              grade.hours === hours
                ? sportTrainerMenuBtnActive
                : sportTrainerMenuBtn,
            )}
            disabled={disabled}
            onClick={() => onHoursChange(grade.id, hours)}
          >
            {hours}h
          </button>
        ))}
      </div>
    </li>
  );
}
