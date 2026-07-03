import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import type { AcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { useMyAcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { SportStudentTrainingModal } from "@/components/sport/SportStudentTrainingModal.tsx";
import { sportTrainingTitle } from "@/components/sport/sport-training-label.ts";
import {
  formatTimeRangeMoscow,
  getSchedulePeriodBounds,
  moscowDateKey,
  toScheduleApiDateTime,
} from "@/components/sport/sport-week-utils.ts";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import moment from "moment/moment";
import { useMemo, useState } from "react";
import "@/components/calendar/fullcalendar-list-styles.ts";
import "@/components/calendar/styles-calendar.css";

export function SportPersonalCalendarSection({
  enabled,
  studentId,
  trainerGroupIds,
}: {
  enabled: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
}) {
  const { academicCalendar } = useMyAcademicCalendar();
  const [selected, setSelected] =
    useState<SchemaTrainingInfoPersonalSchema | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getSchedulePeriodBounds(0),
    [],
  );

  const {
    data: personalSchedule,
    isPending,
    isError,
  } = $sport.useQuery(
    "get",
    "/users/me/schedule",
    {
      params: {
        query: {
          start: toScheduleApiDateTime(periodStart),
          end: toScheduleApiDateTime(periodEnd),
        },
      },
    },
    { enabled },
  );

  const upcomingCheckIns = useMemo(() => {
    const now = Date.now();

    return (personalSchedule ?? [])
      .filter(
        (row) =>
          row.checked_in &&
          row.training.max_checkins > 0 &&
          new Date(row.training.end).getTime() > now,
      )
      .toSorted(
        (a, b) =>
          new Date(a.training.start).getTime() -
          new Date(b.training.start).getTime(),
      );
  }, [personalSchedule]);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, SchemaTrainingInfoPersonalSchema[]>();

    for (const row of upcomingCheckIns) {
      const key = moscowDateKey(row.training.start);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, rows]) => ({
        dateKey,
        rows,
        dayStartIso: rows[0]!.training.start,
      }));
  }, [upcomingCheckIns]);

  if (isError) {
    return (
      <div className="alert alert-error">
        Personal calendar could not be loaded.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-medium">Personal Calendar</h2>
        <Link to="/calendar" className="btn btn-outline btn-primary btn-sm">
          View full calendar
        </Link>
      </div>

      {isPending ? (
        <div className="skeleton h-64 w-full" />
      ) : (
        <div className="fc fc-direction-ltr fc-theme-standard fc-media-screen">
          <div className="fc-view fc-list">
            <div className="fc-scroller">
              <table className="fc-list-table border-base-300 border">
                <tbody>
                  {dayGroups.length === 0 ? (
                    <tr>
                      <td className="fc-list-empty">
                        <div className="fc-list-empty-cushion">
                          No upcoming trainings
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dayGroups.map(({ dateKey, rows, dayStartIso }, index) => (
                      <DayGroupRows
                        key={dateKey}
                        dayStartIso={dayStartIso}
                        rows={rows}
                        academicCalendar={academicCalendar}
                        isFirst={index === 0}
                        onSelect={setSelected}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selected ? (
        <SportStudentTrainingModal
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          row={selected}
          studentId={studentId}
          trainerGroupIds={trainerGroupIds}
        />
      ) : null}
    </>
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
                onClick={() =>
                  onSelect({
                    ...row,
                    checked_in: true,
                    can_check_in: true,
                  })
                }
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
