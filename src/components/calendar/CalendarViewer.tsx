import { eventsTypes } from "@/api/events";
import CalendarEventPopover from "@/components/calendar/CalendarEventPopover.tsx";
import { SourcesDialog } from "@/components/calendar/SourcesDialog.tsx";
import {
  AcademicCalendar,
  useMyAcademicCalendar,
} from "@/components/dashboard/academic-calendar.tsx";
import {
  DayHeaderContentArg,
  EventApi,
  EventContentArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import clsx from "clsx";
import moment from "moment/moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import iCalendarPlugin from "./iCalendarPlugin";
import "./styles-calendar.css";

export type URLType =
  | string
  | {
      url: string;
      color?: string;
      sourceLink?: string;
      updatedAt?: string;
      eventGroup?: eventsTypes.SchemaViewEventGroup;
    };

export default function CalendarViewer({
  urls,
  initialView = "listMonth",
  viewId = "",
  isFullPage = false,
}: {
  urls: URLType[];
  initialView?: string;
  viewId?: string;
  isFullPage?: boolean;
}) {
  const { academicCalendar } = useMyAcademicCalendar();
  const academicCalendarRef = useRef(academicCalendar);
  useEffect(() => {
    academicCalendarRef.current = academicCalendar;
  }, [academicCalendar]);

  const [popoverInfo, setPopoverInfo] = useState({
    opened: false,
    event: undefined as EventApi | undefined,
    eventElement: undefined as HTMLElement | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);

  const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);

  const setIsOpenCallback = useCallback(
    (opened: boolean) =>
      setPopoverInfo((prev) => {
        if (opened) {
          return { ...prev, opened };
        } else {
          return { opened, event: undefined, eventElement: undefined };
        }
      }),
    [setPopoverInfo],
  );

  const [storedCalendarView, setStoredCalendarView] = useLocalStorage(
    `calendar-view-${viewId}`,
    initialView,
  );
  const [calendarView, setCalendarView] = useState(storedCalendarView);

  useEffect(() => {
    setStoredCalendarView(calendarView);
  }, [calendarView, setStoredCalendarView]);

  const calendarRef = useRef<FullCalendar>(null);

  const calendarComponent = useMemo(
    () => (
      <FullCalendar
        ref={calendarRef}
        eventsSet={(events) => {
          // Remove duplicates.
          // Accumulate 'extendedProps.calendarURLs' to use it later.
          const unique: Record<string, EventApi> = {};
          for (const event of events) {
            // Using 'id' instead of 'title' is a fix for Music romm
            const uniqueId =
              (event.id || event.title) + event.startStr + event.endStr;
            if (!(uniqueId in unique)) {
              unique[uniqueId] = event;
            } else {
              const calendarURLs = (
                unique[uniqueId].extendedProps.calendarURLs as string[]
              ).concat(event.extendedProps.calendarURLs as string[]);
              unique[uniqueId].remove();
              unique[uniqueId] = event;
              unique[uniqueId].setExtendedProp("calendarURLs", calendarURLs);
            }
          }
        }}
        eventDataTransform={(input) => {
          if (
            input.end === null &&
            typeof input.start === "string" &&
            input.start.length === 10
          ) {
            return input; // It is an all-day event, no need to transform
          }

          // Dates have Europe/Moscow timezone,
          // but the sources don't set timezones,
          // so the local zone is set
          if (typeof input.start == "string") {
            let s = input.start;
            if (
              !s.match(/Z|\+/g)?.length &&
              (s.match(/-/g)?.length || 0) <= 2
            ) {
              s += "+03:00";
            }
            input.start = new Date(s);
          }

          if (typeof input.end == "string") {
            let s = input.end;
            if (
              !s.match(/Z|\+/g)?.length &&
              (s.match(/-/g)?.length || 0) <= 2
            ) {
              s += "+03:00";
            }
            input.end = new Date(s);
          }

          if (input.start instanceof Date) {
            input.start = new Date(
              Number(input.start) - input.start.getTimezoneOffset() * 60 * 1000,
            );
          }

          if (input.end instanceof Date) {
            input.end = new Date(
              Number(input.end) - input.end.getTimezoneOffset() * 60 * 1000,
            );
          }

          return input;
        }}
        progressiveEventRendering={true}
        timeZone="UTC+0" // Use the same timezone for everyone
        plugins={[
          momentPlugin,
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          iCalendarPlugin,
        ]}
        initialView={calendarView} // Default view
        eventTimeFormat={{
          // Use 24-hour format
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
          hour12: false,
        }}
        slotLabelFormat={{
          // Use 24-hour format
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
          hour12: false,
        }}
        headerToolbar={{
          // Buttons in header
          left: isFullPage
            ? "prev,title,next today config"
            : "prev,title,next today",
          center: undefined,
          right: "timeGrid3 timeGridWeek dayGridMonth listMonth",
        }}
        buttonText={{
          today: "Today",
          listMonth: "List",
          timeGrid3: "3 days",
          timeGridWeek: "Week",
          dayGridMonth: "Month",
        }}
        customButtons={{
          config: {
            text: `${initialView === "listMonth" ? "" : "Config & Export"}`,
            click() {
              setSourcesDialogOpen(true);
            },
          },
        }}
        titleFormat={(arg) => {
          if (arg.date.year === new Date().getFullYear()) {
            // Show only month if current year, show short month name if width is small
            return moment(arg.date).format(
              initialView === "listMonth" ? "MMM" : "MMMM",
            );
          } else {
            // Show month and year otherwise
            return moment(arg.date).format("MMMM YYYY");
          }
        }}
        views={{
          listMonth: {
            eventContent: renderEventListMonth,
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
              `Week ${calculateWeek(academicCalendarRef.current, moment(arg.date).toDate())}`,
          },
          timeGridWeek: {
            eventContent: renderEventTimeGridWeek,
            dayHeaderContent: renderDayHeader,
            weekNumbers: true,
          },
          timeGrid3: {
            type: "timeGrid",
            dayCount: 3,
            eventContent: renderEventTimeGridWeek,
            dayHeaderContent: renderDayHeader,
            weekNumbers: true,
          },
          dayGridMonth: {
            eventContent: renderEventDayGridMonth,
          },
        }}
        allDayText="" // Remove text in all day row
        // displayEventEnd={true} // Display end time
        nowIndicator={true} // Display current time as line
        nowIndicatorContent={(arg) => {
          if (
            arg.date.getUTCHours() === 0 &&
            arg.date.getUTCMinutes() === 0 &&
            arg.date.getUTCSeconds() === 0
          )
            return null; // It's a line, not a label
          // Fix timezone
          const text = moment(
            Number(arg.date) + arg.date.getTimezoneOffset() * 60 * 1000,
          ).format("HH:mm");
          const isNearTimeLabel =
            arg.date.getUTCMinutes() < 15 || arg.date.getUTCMinutes() > 45;
          if (!isNearTimeLabel) {
            return <div>{text}</div>;
          } else {
            return (
              <div className="bg-base-100 -mt-6 flex h-12 translate-y-2 items-center justify-end">
                {text}
              </div>
            );
          }
        }}
        firstDay={1} // From Monday
        navLinks={false} // Dates are clickable
        weekNumbers={true} // Display numbers of weeks
        weekNumberFormat={{ week: "long" }} // Show "Week 1", not "W1"
        weekNumberClassNames="text-sm week-cell" // Small text size
        weekNumberCalculation={(d) =>
          calculateWeek(academicCalendarRef.current, d)
        } // Display academic week numbers
        weekNumberContent={(arg) => {
          return (
            <span className="whitespace-pre-wrap sm:whitespace-normal">
              {arg.text.replace(" ", "\n")}
            </span>
          );
        }}
        height={isFullPage ? "100%" : undefined} // Full height
        contentHeight={isFullPage ? undefined : "auto"} // Do not add scrollbar on in-page calendars
        eventInteractive={true} // Make event tabbable
        expandRows={true}
        eventClassNames="cursor-pointer text-sm rounded-md! bg-transparent! border-0! overflow-clip"
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          info.jsEvent.stopPropagation();
          // We should check prev value via argument because 'eventElement' may be outdated in current closure
          setPopoverInfo((prev) => ({
            event: info.event,
            eventElement: info.el,
            opened: !(prev.opened && prev.eventElement === info.el),
          }));
        }}
        // slotMinTime="07:00:00" // Cut everything earlier than 7am
        scrollTime="07:30:00" // Scroll to 7:30am on launch
        scrollTimeReset={false} // Do not reset scroll on date switch
        noEventsContent={() => "No events this month"} // Custom message
        datesSet={({ view }) => setCalendarView(view.type)}
        loading={setIsLoading}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    // Run in the next tick
    setTimeout(() => {
      const eventSourcesPrev = calendarApi.getEventSources();
      const eventSourcesToGet = urls.map((url) =>
        typeof url === "string"
          ? {
              url: url,
              format: "ics",
            }
          : {
              url: url.url,
              format: "ics",
              color: url.color,
              extraParams: {
                sourceLink: url.sourceLink,
                updatedAt: url.updatedAt,
                eventGroup: url.eventGroup,
              },
            },
      );

      // Remove old sources that are not in the list
      for (const eventSource of eventSourcesPrev) {
        // Check if the source is in the list of sources to get
        const found = eventSourcesToGet.find(
          (source) => source.url === eventSource.url,
        );
        if (!found) {
          eventSource.remove();
        }
      }

      // Add new sources
      for (const eventSource of eventSourcesToGet) {
        // Check if the source is already in the calendar
        const found = eventSourcesPrev.find(
          (source) => source.url === eventSource.url,
        );
        if (!found) {
          calendarApi.addEventSource(eventSource);
        }
      }
    });
  }, [urls, isFullPage]);

  return (
    <div
      className={clsx(
        isFullPage ? "h-full overflow-clip" : "",
        isLoading && "calendar-loading",
      )}
    >
      {calendarComponent}
      {popoverInfo.event && popoverInfo.eventElement && (
        <CalendarEventPopover
          event={popoverInfo.event}
          isOpen={popoverInfo.opened}
          setIsOpen={setIsOpenCallback}
          eventElement={popoverInfo.eventElement}
        />
      )}
      <SourcesDialog
        open={sourcesDialogOpen}
        onOpenChange={setSourcesDialogOpen}
      />
    </div>
  );
}

function renderEventListMonth({ event }: EventContentArg) {
  return (
    <div className="flex flex-wrap gap-x-1 text-left">
      {event.title}
      <span className="text-inh-inactive break-all">
        {event.extendedProps.location}
      </span>
    </div>
  );
}

function renderEventTimeGridWeek({
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
        className="line-clamp-2 text-sm font-medium"
        style={{
          color: `color-mix(in srgb, ${background} 60%, var(--color-base-content))`,
        }}
      >
        {event.title}
      </span>
      {timeText && (
        <span className="text-opacity-50 line-clamp-2 text-xs">
          {" "}
          {timeText}
        </span>
      )}
      <span
        className={clsx(
          "line-clamp-2 text-xs",
          event.allDay && "hidden sm:inline",
        )}
      >
        {event.extendedProps.location}
      </span>
    </div>
  );
}

function renderEventDayGridMonth({
  event,
  borderColor,
  backgroundColor,
  timeText,
}: EventContentArg) {
  return (
    <div className="flex w-full flex-row items-center overflow-hidden">
      <div
        className="fc-daygrid-event-dot"
        style={{ borderColor: borderColor || backgroundColor }}
      />
      <div className="fc-event-title text-base-content w-full max-w-full text-xs">
        {event.title || <>&nbsp;</>}
      </div>
      {timeText && (
        <div className="text-inh-inactive ml-1 hidden w-fit text-right text-xs @5xl/content:block">
          {timeText}
        </div>
      )}
    </div>
  );
}

function renderDayHeader({ date }: DayHeaderContentArg) {
  // Show weekday and day number in the day header
  // The day number is highlighted with a red background if it is today
  return (
    <>
      {moment(date).format("ddd")}{" "}
      <span className="whitespace-pre-wrap sm:hidden">{"\n"}</span>
      <span className="inline-flex w-fit items-center justify-center rounded-md in-[.fc-day-today]:bg-red-500 in-[.fc-day-today]:px-1 in-[.fc-day-today]:text-white">
        {moment(date).format("D")}
      </span>
    </>
  );
}

function calculateWeek(
  academicCalendar: AcademicCalendar | undefined,
  date: Date,
) {
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
