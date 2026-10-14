import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import { toScheduleApiDateTime } from "@/components/sport/sport-week-utils.ts";
import type { DashboardActivity } from "./activities.ts";

/** Checked-in trainings that still accept attendance, as dashboard activities. */
export function normalizeSportActivities(
  rows: SchemaTrainingInfoPersonalSchema[],
): DashboardActivity[] {
  return rows
    .filter((row) => row.checked_in && row.training.max_checkins > 0)
    .map((row) => ({
      id: String(row.training.id),
      title: sportTrainingTitle(row),
      start: new Date(row.training.start),
      end: new Date(row.training.end),
      allDay: row.training.is_all_day,
      location: row.training.training_location?.name ?? undefined,
    }));
}

/** Day-stable query parameters include ongoing sessions without refetching every tick. */
export function getSportCalendarRange(nowMs: number) {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  // Include the entire seventh day ahead while keeping the query day-stable.
  end.setDate(end.getDate() + 8);
  // The API flags check-ins by training START within the query range, even for
  // overlapping sessions. Include yesterday to preserve overnight check-ins.
  start.setDate(start.getDate() - 1);
  return {
    start: toScheduleApiDateTime(start),
    end: toScheduleApiDateTime(end),
  };
}
