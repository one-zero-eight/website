import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import type { EventInput } from "@fullcalendar/core";

export const SPORT_CALENDAR_EVENT_ID_PREFIX = "sport-schedule-api-";
export const SPORT_CALENDAR_COLOR = "seagreen";
export const SPORT_CALENDAR_SOURCE_LINK = "https://sport.innopolis.university";

export function toCalendarSpace(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
}

export function fromCalendarSpace(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
}

export function parseSportEventDateForCalendar(iso: string): Date {
  let parsed = iso;
  if (
    !parsed.match(/Z|\+/g)?.length &&
    (parsed.match(/-/g)?.length || 0) <= 2
  ) {
    parsed += "+03:00";
  }

  return toCalendarSpace(new Date(parsed));
}

export function filterUpcomingCheckedInSchedule(
  rows: SchemaTrainingInfoPersonalSchema[],
): SchemaTrainingInfoPersonalSchema[] {
  const now = Date.now();

  return rows.filter(
    (row) =>
      row.checked_in &&
      row.training.max_checkins > 0 &&
      new Date(row.training.end).getTime() > now,
  );
}

export function trainingScheduleToCalendarEvent(
  row: SchemaTrainingInfoPersonalSchema,
): EventInput {
  const training = row.training;

  return {
    id: `${SPORT_CALENDAR_EVENT_ID_PREFIX}${training.id}`,
    title: sportTrainingTitle({ training }),
    start: parseSportEventDateForCalendar(training.start),
    end: parseSportEventDateForCalendar(training.end),
    allDay: training.is_all_day,
    color: SPORT_CALENDAR_COLOR,
    extendedProps: {
      location: training.training_location?.name ?? "",
      sourceLink: SPORT_CALENDAR_SOURCE_LINK,
    },
  };
}

export function isSportCalendarEventId(id: string | undefined): boolean {
  return id?.startsWith(SPORT_CALENDAR_EVENT_ID_PREFIX) ?? false;
}
