import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import type { AcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { useMyAcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import {
  formatTimeRangeMoscow,
  moscowDateKey,
} from "@/components/sport/sport-week-utils.ts";
import { cn } from "@/lib/ui/cn";
import moment from "moment/moment";
import { useMemo } from "react";
import "@/components/calendar/fullcalendar-list-styles.ts";
import "@/components/calendar/styles-calendar.css";

export function SportTrainingsCalendarList({
  rows,
  emptyText,
  compactEmpty = false,
  onSelect,
}: {
  rows: SchemaTrainingInfoPersonalSchema[];
  emptyText: string;
  compactEmpty?: boolean;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
}) {
  const { academicCalendar } = useMyAcademicCalendar();

  const dayGroups = useMemo(() => {
    const groups = new Map<string, SchemaTrainingInfoPersonalSchema[]>();

    for (const row of rows) {
      const key = moscowDateKey(row.training.start);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, dayRows]) => ({
        dateKey,
        rows: dayRows,
        dayStartIso: dayRows[0]!.training.start,
      }));
  }, [rows]);

  return (
    <div className="fc fc-direction-ltr fc-theme-standard fc-media-screen">
      <div className="fc-view fc-list">
        <div className="fc-scroller">
          <table className="fc-list-table border-base-300 border">
            <tbody>
              {dayGroups.length === 0 ? (
                <tr>
                  <td className="fc-list-empty">
                    <div
                      className={cn(
                        "fc-list-empty-cushion",
                        compactEmpty && "!h-auto py-10",
                      )}
                    >
                      {emptyText}
                    </div>
                  </td>
                </tr>
              ) : (
                dayGroups.map(
                  ({ dateKey, rows: dayRows, dayStartIso }, index) => (
                    <DayGroupRows
                      key={dateKey}
                      dayStartIso={dayStartIso}
                      rows={dayRows}
                      academicCalendar={academicCalendar}
                      isFirst={index === 0}
                      onSelect={onSelect}
                    />
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DayGroupRows({
  dayStartIso,
  rows,
  academicCalendar,
  isFirst,
  onSelect,
}: {
  dayStartIso: string;
  rows: SchemaTrainingInfoPersonalSchema[];
  academicCalendar: AcademicCalendar | undefined;
  isFirst: boolean;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
}) {
  const day = moment(dayStartIso);
  const isToday =
    moscowDateKey(dayStartIso) === moscowDateKey(new Date().toISOString());
  const weekNumber = calculateWeek(academicCalendar, day.toDate());

  return (
    <>
      <tr
        className={cn(
          "fc-list-day bg-base-200",
          isToday && "fc-day-today",
          !isFirst && "border-base-300 border-t",
        )}
        data-date={day.format("YYYY-MM-DD")}
      >
        <td className="fc-list-day-side bg-base-200">
          {weekNumber != null ? (
            <span className="fc-list-day-side-text">Week {weekNumber}</span>
          ) : null}
        </td>
        <td colSpan={2} className="bg-base-200">
          <span className="fc-list-day-text">{formatListDayHeading(day)}</span>
        </td>
      </tr>

      {rows.map((row) => {
        const training = row.training;
        const location = training.training_location?.name ?? "";

        return (
          <tr
            key={training.id}
            className="fc-list-event border-base-300 border-t"
          >
            <td className="fc-list-event-time">
              {formatTimeRangeMoscow(training.start, training.end)}
            </td>
            <td className="fc-list-event-graphic">
              <span className="fc-list-event-dot" />
            </td>
            <td className="fc-list-event-title">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelect(row)}
              >
                <div className="flex flex-wrap gap-x-1 text-left">
                  {sportTrainingTitle({ training })}
                  {location ? (
                    <span className="text-base-content/30 break-all">
                      {location}
                    </span>
                  ) : null}
                </div>
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function formatListDayHeading(day: moment.Moment): string {
  if (day.year() === moment().year()) {
    return day.format("MMMM D, dddd");
  }

  return day.format("YYYY, MMMM D");
}

function calculateWeek(
  academicCalendar: AcademicCalendar | undefined,
  date: Date,
): number | null {
  if (!academicCalendar) {
    return null;
  }

  const semesterStart = new Date(academicCalendar.startDate).getTime();
  const semesterEnd = new Date(academicCalendar.endDate).getTime();
  const time = date.getTime();

  if (time < semesterStart || time >= semesterEnd) {
    return null;
  }

  const weekLength = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((time - semesterStart) / weekLength) + 1;
}
