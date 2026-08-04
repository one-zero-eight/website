import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import type { QueryClient } from "@tanstack/react-query";

export const SPORT_TRAINING_STATUS_COLORS = {
  trainer: "#F1C40F",
  registered: "#8D4CF6",
  unavailable: "#EF4444",
} as const;

/** Refresh schedule + hours summary after a check-in/check-out mutation. */
export function invalidateSportCheckinQueries(
  queryClient: QueryClient,
  studentId: number,
) {
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

  if (training.checkins_count >= training.max_checkins) {
    return true;
  }

  return new Date(training.start).getTime() <= Date.now();
}

export function canShowCheckInButton(
  row: SchemaTrainingInfoPersonalSchema,
  checkedIn: boolean,
  trainerGroupIds: ReadonlySet<number>,
): boolean {
  if (isTrainerTraining(row, trainerGroupIds)) {
    return false;
  }

  return checkedIn || !isCheckInUnavailable(row, checkedIn);
}

/**
 * Status color shown as the calendar list event dot:
 * yellow when you train the group, purple when you're checked in,
 * red when check-in is unavailable, otherwise the calendar's default color.
 */
export function getTrainingStatusColor(
  row: SchemaTrainingInfoPersonalSchema,
  trainerGroupIds: ReadonlySet<number>,
): string | undefined {
  if (isTrainerTraining(row, trainerGroupIds)) {
    return SPORT_TRAINING_STATUS_COLORS.trainer;
  }

  if (row.checked_in) {
    return SPORT_TRAINING_STATUS_COLORS.registered;
  }

  if (isCheckInUnavailable(row, row.checked_in)) {
    return SPORT_TRAINING_STATUS_COLORS.unavailable;
  }

  return undefined;
}
