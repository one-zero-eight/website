import type { AcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import type { EventContentArg } from "@fullcalendar/core";

/**
 * Shared with CalendarViewer's listMonth view so any calendar rendered as a
 * list (site-wide "/calendar" and the sport section) produces the same markup.
 */
export const CALENDAR_LIST_EVENT_TIME_FORMAT = {
  hour: "2-digit",
  minute: "2-digit",
  meridiem: false,
  hour12: false,
} as const;

export const CALENDAR_LIST_EVENT_CLASS_NAMES =
  "cursor-pointer text-sm rounded-md! bg-transparent! border-0! overflow-clip";

export function renderCalendarListEventContent({ event }: EventContentArg) {
  return (
    <div className="flex flex-wrap gap-x-1 text-left">
      {event.title}
      <span className="text-base-content/30 break-all">
        {event.extendedProps.location}
      </span>
    </div>
  );
}

export function calculateAcademicWeek(
  academicCalendar: AcademicCalendar | undefined,
  date: Date,
): number {
  if (!academicCalendar) {
    return Infinity;
  }

  // Calculate academic week number
  const semesterStart = new Date(academicCalendar.startDate).getTime(); // Monday, first day of first week
  const semesterEnd = new Date(academicCalendar.endDate).getTime(); // Monday, the day after the last week

  const time = date.getTime();
  if (time < semesterStart || time >= semesterEnd) {
    return Infinity; // Out of semester
  }

  const weekLength = 7 * 24 * 60 * 60 * 1000; // 7 days
  return Math.floor((time - semesterStart) / weekLength) + 1;
}
