import {
  DayHeaderContentArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { cn } from "@/lib/ui/cn";
import moment from "moment/moment";
import { type RefObject } from "react";

function renderTvDayHeader({ date }: DayHeaderContentArg) {
  return (
    <>
      <span className="text-xl font-semibold">
        {moment(date).format("dddd")}
      </span>{" "}
      <div className="inline-flex w-fit items-center justify-center rounded-md text-xl font-semibold in-[.fc-day-today]:bg-red-500 in-[.fc-day-today]:px-2 in-[.fc-day-today]:text-white">
        {moment(date).format("D")}
      </div>
    </>
  );
}

export default function TvCalendarViewer({
  events,
  start,
  end,
  isLoading,
  isError,
  scrollTime,
  calendarRef,
}: {
  events: EventInput[];
  start: Date;
  end: Date;
  isLoading: boolean;
  isError: boolean;
  scrollTime: string;
  calendarRef: RefObject<FullCalendar | null>;
}) {
  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-box border-base-300 bg-base-200 w-full max-w-xl border p-8 text-center">
          <p className="text-error text-2xl font-semibold">
            Failed to load TV page
          </p>
          <p className="text-base-content/70 mt-2 text-lg">
            Room not found or calendar is unavailable.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="skeleton h-12 w-full rounded-md" />
        <div className="skeleton h-full w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="h-full [&_.fc-col-header-cell-cushion]:px-2 [&_.fc-col-header-cell-cushion]:py-1 [&_.fc-col-header-cell-cushion]:text-black! [&_.fc-timegrid-now-indicator-arrow]:text-red-500! [&_.fc-timegrid-now-indicator-line]:border-red-500! [&_.fc-timegrid-slot-label]:text-lg! [&_.fc-timegrid-slot-label]:text-black! [&_.fc-timegrid-slot-label-cushion]:text-lg! [&_.fc-timegrid-slot-label-cushion]:text-black!">
      <FullCalendar
        ref={calendarRef}
        plugins={[momentPlugin, dayGridPlugin, timeGridPlugin]}
        initialView="timeGrid7"
        timeZone="Europe/Moscow"
        firstDay={1}
        headerToolbar={false}
        nowIndicator={true}
        editable={false}
        selectable={false}
        eventStartEditable={false}
        eventDurationEditable={false}
        allDaySlot={false}
        eventInteractive={false}
        height="100%"
        expandRows={true}
        dayHeaders={true}
        views={{
          timeGrid7: {
            type: "timeGrid",
            duration: { days: 7 },
            slotMinHeight: 36,
            dayHeaderContent: renderTvDayHeader,
            eventContent: renderEventTimeGrid,
          },
        }}
        visibleRange={{ start, end }}
        events={events}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        nowIndicatorContent={(arg) => {
          if (
            arg.date.getUTCHours() === 0 &&
            arg.date.getUTCMinutes() === 0 &&
            arg.date.getUTCSeconds() === 0
          )
            return null;
          const text = moment(Number(arg.date) - 3 * 60 * 60 * 1000).format(
            "HH:mm",
          );
          const isNearTimeLabel =
            arg.date.getUTCMinutes() < 15 || arg.date.getUTCMinutes() > 45;
          if (!isNearTimeLabel) {
            return <div className="text-lg text-red-500">{text}</div>;
          }
          return (
            <div className="bg-base-100 -mt-6 flex h-12 translate-y-2 items-center justify-end text-lg text-red-500">
              {text}
            </div>
          );
        }}
        eventClassNames="pointer-events-none cursor-default text-lg rounded-md! bg-transparent! border-0! overflow-clip"
        scrollTime={scrollTime}
        scrollTimeReset={false}
      />
    </div>
  );
}

function renderEventTimeGrid({
  event,
  borderColor,
  backgroundColor,
  timeText,
}: EventContentArg) {
  const border =
    borderColor !== "undefined"
      ? borderColor
      : backgroundColor !== "undefined"
        ? backgroundColor
        : "#9A2EFF";
  const background =
    backgroundColor !== "undefined"
      ? backgroundColor
      : borderColor !== "undefined"
        ? borderColor
        : "#9A2EFF";
  return (
    <div
      className="h-full border-l-4 p-1 text-left backdrop-blur-xs"
      style={{
        borderLeftColor: border,
        backgroundColor: `color-mix(in srgb, ${background} 40%, transparent)`,
        color: `color-mix(in srgb, ${background} 75%, var(--color-base-content))`,
      }}
    >
      <span
        className="line-clamp-2 text-xl leading-tight font-semibold"
        style={{
          color: `color-mix(in srgb, ${background} 60%, var(--color-base-content))`,
        }}
      >
        {event.title}
      </span>
      {timeText && (
        <span className="text-opacity-80 line-clamp-2 text-base leading-tight">
          {timeText}
        </span>
      )}
      <span
        className={cn(
          "line-clamp-2 text-base leading-tight",
          event.allDay && "hidden sm:inline",
        )}
      >
        {event.extendedProps.location}
      </span>
    </div>
  );
}
