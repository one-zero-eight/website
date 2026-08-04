import { $sport } from "@/api/sport";
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
import {
  canShowCheckInButton,
  invalidateSportCheckinQueries,
} from "@/components/sport/sport-checkin-utils.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment/moment";
import { useMemo, useState } from "react";

export function SportTrainingsCalendarList({
  rows,
  emptyText,
  compactEmpty = false,
  studentId,
  trainerGroupIds,
  onSelect,
}: {
  rows: SchemaTrainingInfoPersonalSchema[];
  emptyText: string;
  compactEmpty?: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
}) {
  const { academicCalendar } = useMyAcademicCalendar();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [pendingTrainingId, setPendingTrainingId] = useState<number | null>(
    null,
  );

  const { mutate: setCheckin } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSuccess: (_, vars) => {
        const checkin = vars.params.query.checkin;
        showSuccess(
          checkin ? "Checked in" : "Checked out",
          checkin
            ? "You are signed up for this training."
            : "You are no longer signed up.",
        );
      },
      onError: () => {
        showError(
          "Could not update check-in",
          "Please try again or use the Telegram bot.",
        );
      },
      onSettled: (_data, _error, vars) => {
        invalidateSportCheckinQueries(queryClient, studentId);
        setPendingTrainingId((current) =>
          current === vars.params.path.training_id ? null : current,
        );
      },
    },
  );

  function handleCheckin(
    row: SchemaTrainingInfoPersonalSchema,
    checkin: boolean,
  ) {
    setPendingTrainingId(row.training.id);
    setCheckin({
      params: {
        path: { training_id: row.training.id },
        query: { checkin },
      },
    });
  }

  function renderEventContent(arg: EventContentArg) {
    const row = arg.event.extendedProps.row as
      | SchemaTrainingInfoPersonalSchema
      | undefined;

    if (!row) {
      return renderCalendarListEventContent(arg);
    }

    const checkedIn = row.checked_in;
    const showCheckInButton = canShowCheckInButton(
      row,
      checkedIn,
      trainerGroupIds,
    );
    const isPending = pendingTrainingId === row.training.id;

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-1 text-left">
          {arg.event.title}
          <span className="text-base-content/30 break-all">
            {arg.event.extendedProps.location}
          </span>
        </div>
        {showCheckInButton ? (
          <button
            type="button"
            className={cn(
              "btn btn-xs shrink-0",
              checkedIn ? "btn-error btn-outline" : "btn-primary",
            )}
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              handleCheckin(row, !checkedIn);
            }}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : checkedIn ? (
              "Check-out"
            ) : (
              "Check-in"
            )}
          </button>
        ) : null}
      </div>
    );
  }

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
          eventContent: renderEventContent,
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
