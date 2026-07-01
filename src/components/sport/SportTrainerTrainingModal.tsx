import { $sport } from "@/api/sport";
import type {
  SchemaAttendanceStudentGradeSchema,
  SchemaAttendanceSuggestionSchema,
  SchemaBadGradeReportSchema,
  SchemaTrainingInfoPersonalSchema,
} from "@/api/sport/types.ts";
import { SportTrainingModalShell } from "@/components/sport/SportTrainingModalShell.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainerModalView = "main" | "attendees";
type HoursFilter = 0 | 1 | 2;

const ALL_HOURS_FILTERS: HoursFilter[] = [0, 1, 2];
const HOLD_ALL_ZERO_MS = 3000;

const sportTrainerMenuBtn =
  "btn btn-outline border-2 hover:border-[#8D4CF6] hover:bg-transparent hover:text-[#8D4CF6] active:border-[#8D4CF6] active:bg-transparent active:text-[#8D4CF6]";
const sportTrainerMenuBtnActive =
  "border-[#8D4CF6] bg-transparent text-[#8D4CF6] hover:border-[#8D4CF6] hover:bg-transparent hover:text-[#8D4CF6] active:border-[#8D4CF6] active:bg-transparent active:text-[#8D4CF6]";

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

  return (
    <SportTrainingModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onBack={view === "attendees" ? () => setView("main") : undefined}
    >
      {view === "main" ? (
        <SportTrainerTrainingModalMain
          open={open}
          trainingId={row.training.id}
          groupId={row.training.group_id}
          onViewAttendees={() => setView("attendees")}
        />
      ) : (
        <SportTrainerTrainingModalAttendees
          open={open}
          trainingId={row.training.id}
          groupId={row.training.group_id}
        />
      )}

      <div className="border-t-base-300 flex shrink-0 flex-wrap gap-2 border-t p-4">
        <button
          type="button"
          className={cn(
            "btn btn-ghost",
            "active:border active:border-[#8D4CF6] active:text-[#8D4CF6]",
          )}
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    </SportTrainingModalShell>
  );
}

function SportTrainerTrainingModalMain({
  open,
  trainingId,
  groupId,
  onViewAttendees,
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
  onViewAttendees: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <SportTrainerStudentAddField
        open={open}
        trainingId={trainingId}
        groupId={groupId}
      />

      <button type="button" className={cn(sportTrainerMenuBtn, "w-full")}>
        Add csv
      </button>

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
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess, showWarning } = useToast();
  const [hoursFilter, setHoursFilter] = useState<Set<HoursFilter>>(
    () => new Set(ALL_HOURS_FILTERS),
  );
  const [holdHintVisible, setHoldHintVisible] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setHoursFilter(new Set(ALL_HOURS_FILTERS));
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
        invalidateAttendance(queryClient, trainingId);
      },
      onError: () => {
        showError("Could not update attendance", "Please try again.");
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

  const filteredGrades = useMemo(() => {
    return sortedGrades.filter((grade) =>
      hoursFilter.has(grade.hours as HoursFilter),
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
    if (grade?.hours === hours) {
      return;
    }

    markHours([{ student_id: studentId, hours }]);
  }

  function handleAllHours(hours: number) {
    if (!sortedGrades.length) {
      return;
    }

    markHours(sortedGrades.map((grade) => ({ student_id: grade.id, hours })));
  }

  function handleAllZeroHoldStart() {
    if (!sortedGrades.length || markPending) {
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

  function toggleHoursFilter(hours: HoursFilter) {
    setHoursFilter((current) => {
      const next = new Set(current);
      if (next.has(hours)) {
        if (next.size === 1) {
          return current;
        }
        next.delete(hours);
        return next;
      }

      next.add(hours);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {holdHintVisible ? (
        <div className="text-warning text-center text-sm font-medium">
          hold to set all 0h
        </div>
      ) : null}

      <SportTrainerStudentAddField
        open={open}
        trainingId={trainingId}
        groupId={groupId}
      />

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
              disabled={!sortedGrades.length || markPending}
              onClick={() => handleAllHours(2)}
            >
              All 2h
            </button>
            <button
              type="button"
              className={cn(sportTrainerMenuBtn, "btn-sm")}
              disabled={!sortedGrades.length || markPending}
              onPointerDown={handleAllZeroHoldStart}
              onPointerUp={handleAllZeroHoldEnd}
              onPointerLeave={handleAllZeroHoldEnd}
              onPointerCancel={handleAllZeroHoldEnd}
            >
              All 0h
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_HOURS_FILTERS.map((hours) => (
              <button
                key={hours}
                type="button"
                className={cn(
                  "btn btn-xs border-2",
                  hoursFilter.has(hours)
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
            <ul className="flex flex-col gap-2">
              {filteredGrades.map((grade) => (
                <SportTrainerAttendanceRow
                  key={grade.id}
                  grade={grade}
                  disabled={markPending}
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

function SportTrainerStudentAddField({
  open,
  trainingId,
  groupId,
}: {
  open: boolean;
  trainingId: number;
  groupId: number;
}) {
  const queryClient = useQueryClient();
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
        invalidateAttendance(queryClient, trainingId);
        setSelectedStudent(null);
        setSearchTerm("");
        setSuggestionsOpen(false);
      },
      onError: () => {
        showError("Could not update attendance", "Please try again.");
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

  function handleAddTwoHours() {
    if (!selectedStudent) {
      return;
    }

    markAttendance({
      params: { path: { training_id: trainingId } },
      body: {
        training_id: trainingId,
        students_hours: [{ student_id: selectedStudent.id, hours: 2 }],
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
        disabled={!selectedStudent || markPending}
        onClick={handleAddTwoHours}
      >
        {markPending ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Add 2"
        )}
      </button>
    </div>
  );
}

function SportTrainerAttendanceRow({
  grade,
  disabled,
  onHoursChange,
}: {
  grade: SchemaAttendanceStudentGradeSchema;
  disabled: boolean;
  onHoursChange: (studentId: number, hours: number) => void;
}) {
  return (
    <li className="border-base-300 rounded-box flex flex-col gap-2 border p-3 @sm/modal:flex-row @sm/modal:items-center @sm/modal:justify-between">
      <div className="min-w-0">
        <div className="font-medium wrap-break-word">
          {formatStudentName(grade)}
        </div>
        <div className="text-base-content/60 text-xs wrap-break-word">
          {grade.email}
        </div>
      </div>
      <div className="join shrink-0">
        {([0, 1, 2] as const).map((hours) => (
          <button
            key={hours}
            type="button"
            className={cn(
              "btn btn-sm join-item min-w-10 border-2",
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

function formatStudentName(student: { first_name: string; last_name: string }) {
  return `${student.first_name} ${student.last_name}`.trim();
}

function invalidateAttendance(
  client: ReturnType<typeof useQueryClient>,
  trainingId: number,
) {
  client.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/trainings/{training_id}/attendance",
      {
        params: { path: { training_id: trainingId } },
      },
    ).queryKey,
  });
}

function handleAttendanceResponse(
  data: { email: string; hours: number }[] | SchemaBadGradeReportSchema,
  showSuccess: ReturnType<typeof useToast>["showSuccess"],
  showWarning: ReturnType<typeof useToast>["showWarning"],
) {
  if (Array.isArray(data)) {
    showSuccess("Attendance updated", "Hours have been saved.");
    return;
  }

  showWarning("Attendance issue", data.description);
}
