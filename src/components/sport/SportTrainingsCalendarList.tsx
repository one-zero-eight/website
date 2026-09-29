import { $clubs } from "@/api/clubs";
import { $sport } from "@/api/sport";
import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";
import "@/components/calendar/styles-calendar.css";
import {
  CALENDAR_LIST_EVENT_TIME_FORMAT,
  calculateAcademicWeek,
} from "@/components/calendar/calendar-list-view.tsx";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { useMyAcademicCalendar } from "@/components/dashboard/academic-calendar.tsx";
import { trainingRowToListEvent } from "@/components/sport/sport-calendar-events.ts";
import {
  canShowCheckInButton,
  invalidateSportCheckinQueries,
  isTrainerTraining,
} from "@/components/sport/sport-checkin-utils.ts";
import { cn } from "@/lib/ui/cn";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import moment from "moment/moment";
import { useEffect, useMemo, useState } from "react";

export function SportTrainingsCalendarList({
  rows,
  emptyText,
  compactEmpty = false,
  studentId,
  trainerGroupIds,
  onSelect,
  onCheckinSuccess,
}: {
  rows: SchemaTrainingInfoPersonalSchema[];
  emptyText: string;
  compactEmpty?: boolean;
  studentId: number;
  trainerGroupIds: ReadonlySet<number>;
  onSelect: (row: SchemaTrainingInfoPersonalSchema) => void;
  onCheckinSuccess: () => void;
}) {
  const { academicCalendar } = useMyAcademicCalendar();
  const { data: clubs, isError: clubsError } = $clubs.useQuery(
    "get",
    "/clubs/",
  );
  const { data: sports, isError: sportsError } = $sport.useQuery(
    "get",
    "/sports",
  );
  const { data: semesters, isError: historyError } = $sport.useQuery(
    "get",
    "/students/{student_id}/semester-history",
    { params: { path: { student_id: studentId } } },
    {
      enabled: rows.some(
        (row) => new Date(row.training.end).getTime() <= Date.now(),
      ),
    },
  );
  const earnedHoursByTrainingId = useMemo(
    () =>
      new Map(
        semesters?.flatMap((semester) =>
          semester.trainings.map(
            (training) => [training.training_id, training.hours] as const,
          ),
        ),
      ),
    [semesters],
  );
  const groupsById = useMemo(
    () =>
      new Map(
        sports?.flatMap((sport) =>
          sport.groups.map((group) => [group.id, group] as const),
        ),
      ),
    [sports],
  );
  const clubsBySportId = useMemo(
    () =>
      new Map(
        clubs
          ?.filter((club) => club.is_active && club.sport_id != null)
          .map((club) => [club.sport_id, club] as const),
      ),
    [clubs],
  );
  const [pendingTrainingId, setPendingTrainingId] = useState<number | null>(
    null,
  );
  const [checkinFeedback, setCheckinFeedback] = useState<{
    trainingId: number;
    message: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    if (!checkinFeedback || checkinFeedback.isError) return;

    const timeout = setTimeout(() => setCheckinFeedback(null), 2500);
    return () => clearTimeout(timeout);
  }, [checkinFeedback]);

  const { mutate: setCheckin, isPending: checkinPending } = $sport.useMutation(
    "post",
    "/trainings/{training_id}/checkin",
    {
      onSuccess: (_, vars) => {
        setCheckinFeedback({
          trainingId: vars.params.path.training_id,
          message: vars.params.query.checkin ? "Checked in" : "Checked out",
          isError: false,
        });
        invalidateSportCheckinQueries(studentId);
        if (vars.params.query.checkin) onCheckinSuccess();
      },
      onError: (_error, vars) => {
        setCheckinFeedback({
          trainingId: vars.params.path.training_id,
          message: vars.params.query.checkin
            ? "Check-in failed · Retry"
            : "Check-out failed · Retry",
          isError: true,
        });
      },
      onSettled: (_data, _error, vars) => {
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
    setCheckinFeedback((current) =>
      current?.trainingId === row.training.id ? null : current,
    );
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

    if (!row) return null;

    const club =
      row.training.sport_id == null
        ? undefined
        : clubsBySportId.get(String(row.training.sport_id));
    const group = groupsById.get(row.training.group_id);
    const isPast = new Date(row.training.end).getTime() <= Date.now();
    const earnedHours = earnedHoursByTrainingId.get(row.training.id);
    const checkedIn = row.checked_in;
    const showCheckInButton = canShowCheckInButton(
      row,
      checkedIn,
      trainerGroupIds,
    );
    const isPending = checkinPending && pendingTrainingId === row.training.id;
    const feedback =
      checkinFeedback?.trainingId === row.training.id ? checkinFeedback : null;

    return (
      <div className="flex min-h-10 items-stretch">
        {club?.id ? (
          <ClubLogo
            clubId={club.id}
            logoFileId={club.logo_file_id}
            className="h-auto w-10 rounded-none bg-transparent [&>img]:bg-transparent [&>span]:size-5"
          />
        ) : (
          <div className="w-10 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2 py-2 text-left">
          <span
            className={cn(
              checkedIn && "font-semibold",
              checkedIn ? "text-success" : isPast && "text-base-content/50",
            )}
          >
            {arg.event.title}
          </span>
          {row.training.is_paid || group?.is_paid ? (
            <span className="badge badge-warning badge-xs">Paid</span>
          ) : null}
          {group?.allowed_education_level === 2 ? (
            <span className="badge badge-secondary badge-xs">College only</span>
          ) : null}
          {isTrainerTraining(row, trainerGroupIds) ? (
            <span className="badge badge-info badge-xs">Trainer</span>
          ) : null}
          {earnedHours != null && earnedHours > 0 ? (
            <span className="badge badge-success badge-xs">{earnedHours}h</span>
          ) : null}
        </div>
        {showCheckInButton && !checkedIn ? (
          <span className="text-base-content/50 hidden shrink-0 self-center px-2 text-xs tabular-nums @lg/content:block">
            {Math.max(
              0,
              row.training.max_checkins - row.training.checkins_count,
            )}
            /{row.training.max_checkins}
          </span>
        ) : null}
        {showCheckInButton || (feedback && !feedback.isError) ? (
          <button
            type="button"
            className={cn(
              "btn h-auto min-h-0 shrink-0 self-stretch rounded-none border-0 px-2 text-xs",
              feedback
                ? feedback.isError
                  ? "btn-error"
                  : "btn-success disabled:bg-success! disabled:text-success-content! disabled:opacity-100!"
                : checkedIn
                  ? "btn-error btn-outline"
                  : "btn-primary",
            )}
            disabled={
              checkinPending || (feedback !== null && !feedback.isError)
            }
            title={feedback?.isError ? feedback.message : undefined}
            onClick={(event) => {
              event.stopPropagation();
              handleCheckin(row, !checkedIn);
            }}
          >
            <span className="grid place-items-center">
              <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                Check out
              </span>
              <span className="col-start-1 row-start-1">
                {isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : feedback ? (
                  feedback.isError ? (
                    "Retry"
                  ) : (
                    <span className="icon-[material-symbols--check] text-xl" />
                  )
                ) : checkedIn ? (
                  "Check out"
                ) : (
                  "Check in"
                )}
              </span>
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  const events = useMemo(() => rows.map(trainingRowToListEvent), [rows]);

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
    <div className="[&_.fc-list-event-dot]:hidden [&_.fc-list-event-graphic]:hidden [&_.fc-list-event-time]:px-2! [&_.fc-list-event-title]:p-0!">
      {clubsError || sportsError ? (
        <div className="alert alert-error mb-2">
          Club logos or training restrictions could not be loaded.
        </div>
      ) : null}
      {historyError ? (
        <div className="alert alert-error mb-2">
          Earned sport hours could not be loaded.
        </div>
      ) : null}
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
        eventClassNames={(arg) => {
          const row = arg.event.extendedProps.row as
            | SchemaTrainingInfoPersonalSchema
            | undefined;
          return cn(
            "cursor-pointer text-sm bg-transparent! border-0!",
            row &&
              new Date(row.training.end).getTime() <= Date.now() &&
              "[&_.fc-list-event-time]:text-base-content/50!",
          );
        }}
        eventTimeFormat={CALENDAR_LIST_EVENT_TIME_FORMAT}
        defaultRangeSeparator="–"
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
    </div>
  );
}
