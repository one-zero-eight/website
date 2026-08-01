import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import "@/components/calendar/styles-calendar.css";
import {
  CALENDAR_LIST_EVENT_CLASS_NAMES,
  CALENDAR_LIST_EVENT_TIME_FORMAT,
  calculateAcademicWeek,
  renderCalendarListEventContent,
} from "@/components/calendar/calendar-list-view.tsx";
import { useMyAcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { trainingRowToListEvent } from "@/components/sport/sport-calendar-events.ts";
import { cn } from "@/lib/ui/cn";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import moment from "moment/moment";
import { useMemo } from "react";

export function SportTrainingsCalendarList({
  rows,
  emptyText,
  compactEmpty = false,
  trainerGroupIds,
  onSelect,
}: {
  rows: SchemaTrainingInfoPersonalSchema[];
  emptyText: string;
  compactEmpty?: boolean;
  trainerGroupIds: ReadonlySet<number>;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
}) {
  const { academicCalendar } = useMyAcademicCalendar();

  const events = useMemo(
    () => rows.map((row) => trainingRowToListEvent(row, trainerGroupIds)),
    [rows, trainerGroupIds],
  );

  // The list view only renders events inside its own active date range
  // (defaults to "today's month"), regardless of what's passed via `events`.
  // Anchor that range to the actual data so it isn't silently filtered out.
  const { viewStart, viewDays } = useMemo(() => {
    if (events.length === 0) {
      return { viewStart: new Date(), viewDays: 1 };
    }

    const starts = events.map((event) => (event.start as Date).getTime());
    const ends = events.map((event) => (event.end as Date).getTime());
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));
    const days = Math.max(
      1,
      Math.ceil(
        (maxEnd.getTime() - minStart.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1,
    );

    return { viewStart: minStart, viewDays: days };
  }, [events]);

  return (
    <FullCalendar
      key={`${viewStart.getTime()}-${viewDays}`}
      plugins={[listPlugin]}
      initialView="listMonth"
      initialDate={viewStart}
      dateAlignment="day"
      headerToolbar={false}
      height="auto"
      timeZone="UTC+0"
      firstDay={1}
      events={events}
      eventInteractive
      eventClassNames={CALENDAR_LIST_EVENT_CLASS_NAMES}
      eventTimeFormat={CALENDAR_LIST_EVENT_TIME_FORMAT}
      views={{
        listMonth: {
          duration: { days: viewDays },
          eventContent: renderCalendarListEventContent,
          listDayFormat: (arg) => {
            if (arg.date.year === new Date().getFullYear()) {
              // Show month, day, weekday
              return moment(arg.date).format("MMMM D, dddd");
            } else {
              // Add year if not current year
              return moment(arg.date).format("YYYY, MMMM D");
            }
          },
          listDaySideFormat: (arg) =>
            `Week ${calculateAcademicWeek(academicCalendar, moment(arg.date).toDate())}`,
        },
      }}
      eventClick={(info) => {
        const row = info.event.extendedProps.row as
          | SchemaTrainingInfoPersonalSchema
          | undefined;
        if (row) onSelect(row);
      }}
      noEventsContent={() => (
        <div
          className={cn(
            "fc-list-empty-cushion",
            compactEmpty && "!h-auto py-10",
          )}
        >
          {emptyText}
        </div>
      )}
    />
  );
}
