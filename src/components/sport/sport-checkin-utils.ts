import { $sport } from "@/api/sport";
import type {
  SchemaApiV3RoutersGroupsGroupInfoSchema,
  SchemaStudentInfoSchema,
  SchemaTrainingInfoPersonalSchema,
} from "@/api/sport/types.ts";
import { queryClient } from "@/app/query-client.ts";
import { moscowDateKey } from "@/components/sport/sport-week-utils.ts";

const CHECK_IN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Refresh schedule + hours summary after a check-in/check-out mutation. */
export function invalidateSportCheckinQueries(studentId: number) {
  queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "sport" &&
      q.queryKey[2] === "/users/me/schedule",
  });
  queryClient.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/students/{student_id}/hours-summary",
      {
        params: { path: { student_id: studentId } },
      },
    ).queryKey,
  });
}

export function isTrainerTraining(
  row: SchemaTrainingInfoPersonalSchema,
  trainerGroupIds: ReadonlySet<number>,
): boolean {
  return trainerGroupIds.has(row.training.group_id);
}

export function isCheckInUnavailable(
  row: SchemaTrainingInfoPersonalSchema,
  checkedIn: boolean,
): boolean {
  if (checkedIn) {
    return false;
  }

  const { training } = row;

  if (!row.can_check_in) {
    return true;
  }

  if (new Date(training.start).getTime() - Date.now() > CHECK_IN_WINDOW_MS) {
    return true;
  }

  if (training.checkins_count >= training.max_checkins) {
    return true;
  }

  return new Date(training.end).getTime() <= Date.now();
}

export function getCheckInUnavailableReason(
  row: SchemaTrainingInfoPersonalSchema,
  group?: SchemaApiV3RoutersGroupsGroupInfoSchema,
  student?: SchemaStudentInfoSchema | null,
  dailySchedule?: SchemaTrainingInfoPersonalSchema[],
): string | null {
  if (row.checked_in) return null;

  const { training } = row;
  if (new Date(training.end).getTime() <= Date.now()) {
    return "This training has already ended.";
  }
  if (training.checkins_count >= training.max_checkins) {
    return "No places left for this training.";
  }
  if (new Date(training.start).getTime() - Date.now() > CHECK_IN_WINDOW_MS) {
    return "Check-in opens 7 days before the training.";
  }
  if (row.can_check_in) return null;

  if (
    group &&
    student &&
    group.allowed_medical_groups.length > 0 &&
    !group.allowed_medical_groups.includes(student.medical_group)
  ) {
    return `Your medical group (${student.medical_group}) is not eligible for this training.`;
  }
  if (
    group &&
    student &&
    group.allowed_education_level === 2 &&
    !student.is_college
  ) {
    return "This training is for college students only.";
  }
  if (
    group &&
    student &&
    group.allowed_education_level === 1 &&
    student.is_college
  ) {
    return "This training is for university students only.";
  }
  if (dailySchedule) {
    const trainingDay = moscowDateKey(training.start);
    const checkedInToday = dailySchedule.filter(
      (scheduled) =>
        scheduled.checked_in &&
        moscowDateKey(scheduled.training.start) === trainingDay,
    );
    const durationHours = getAcademicDuration(training);
    const totalHours = checkedInToday.reduce(
      (hours, scheduled) => hours + getAcademicDuration(scheduled.training),
      0,
    );
    if (totalHours + durationHours > 4) {
      return "Daily limit: 4 sport hours (usually 2 trainings).";
    }
    const sameSportHours = checkedInToday.reduce(
      (hours, scheduled) =>
        hours +
        (scheduled.training.sport_id === training.sport_id
          ? getAcademicDuration(scheduled.training)
          : 0),
      0,
    );
    if (training.sport_id != null && sameSportHours + durationHours > 2) {
      return "Daily limit for the same sport: 2 sport hours (usually 1 training).";
    }
  }
  return "Check-in is not available for this training.";
}

function getAcademicDuration(
  training: SchemaTrainingInfoPersonalSchema["training"],
): number {
  if (!training.is_accredited) return 0;

  const durationSeconds =
    (new Date(training.end).getTime() - new Date(training.start).getTime()) /
    1000;
  return Math.min(
    2,
    Math.floor((durationSeconds + 45 * 60 * 0.05) / (45 * 60)),
  );
}

export function canShowCheckInButton(
  row: SchemaTrainingInfoPersonalSchema,
  checkedIn: boolean,
  trainerGroupIds: ReadonlySet<number>,
): boolean {
  if (isTrainerTraining(row, trainerGroupIds)) {
    return false;
  }

  if (checkedIn) {
    return new Date(row.training.start).getTime() > Date.now();
  }

  return !isCheckInUnavailable(row, checkedIn);
}
