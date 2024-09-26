import CalendarEventPopover from "@/components/calendar/CalendarEventPopover.tsx";
import { events } from "@/lib/events";
import { EventApi, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import moment from "moment/moment";
import { useCallback, useEffect, useMemo, useState } from "react";
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
      eventGroup?: events.ViewEventGroup;
    };

export default function CalendarViewer({
  urls,
  initialView = "listMonth",
  viewId = "",
  ...props
}: {
  urls: URLType[];
  initialView?: string;
  viewId?: string;
}) {
  const [popoverInfo, setPopoverInfo] = useState({
    opened: false,
    event: undefined as EventApi | undefined,
    eventElement: undefined as HTMLElement | undefined,
  });

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

  const calendar = useMemo(
    () => (
      <FullCalendar
        eventSources={urls.map((url) =>
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
        )} // Load events by url
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
        progressiveEventRendering={true}
        timeZone="Europe/Moscow" // Use the same timezone for everyone
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
          left: "prev,title,next today",
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
        titleFormat={(arg) => {
          if (arg.date.year === new Date().getFullYear()) {
            // Show only month if current year
            return moment(arg.date).format("MMMM");
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
              `Week ${calculateWeek(moment(arg.date).toDate())}`,
          },
          timeGridWeek: {
            eventContent: renderEventTimeGridWeek,
            weekNumbers: true,
            // Show weekday and date in day header
            dayHeaderContent: (arg) => {
              if (!arg.isToday) {
                return moment(arg.date).format("ddd D");
              }
              // If today, show date in red circle
              return (
                <>
                  {moment(arg.date).format("ddd")}{" "}
                  <div className="inline-flex w-fit items-center justify-center rounded-md bg-red-500 px-1 text-white">
                    {moment(arg.date).format("D")}
                  </div>
                </>
              );
            },
          },
          timeGrid3: {
            type: "timeGrid",
            dayCount: 3,
            eventContent: renderEventTimeGridWeek,
            weekNumbers: true,
            // Show weekday and date in day header
            dayHeaderContent: (arg) => {
              if (!arg.isToday) {
                return moment(arg.date).format("ddd D");
              }
              // If today, show date in red circle
              return (
                <>
                  {moment(arg.date).format("ddd")}{" "}
                  <div className="inline-flex w-fit items-center justify-center rounded-md bg-red-500 px-1 text-white">
                    {moment(arg.date).format("D")}
                  </div>
                </>
              );
            },
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
          const text = moment(Number(arg.date) - 3 * 60 * 60 * 1000).format(
            "HH:mm",
          );
          const isNearTimeLabel =
            arg.date.getUTCMinutes() < 15 || arg.date.getUTCMinutes() > 45;
          if (!isNearTimeLabel) {
            return <div>{text}</div>;
          } else {
            return (
              <div className="-mt-6 flex h-12 translate-y-2 items-center justify-end bg-base">
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
        weekNumberCalculation={calculateWeek} // Display academic week numbers
        // height="100dvh" // Full height
        contentHeight="auto" // Do not add scrollbar
        stickyHeaderDates={false}
        eventInteractive={true} // Make event tabbable
        eventClassNames="cursor-pointer text-sm rounded-md !bg-transparent border-0 overflow-clip"
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
        slotMinTime="07:00:00" // Cut everything earlier than 7am
        scrollTime="07:30:00" // Scroll to 7:30am on launch
        scrollTimeReset={false} // Do not reset scroll on date switch
        noEventsContent={() => "No events this month"} // Custom message
        datesSet={({ view }) => setCalendarView(view.type)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urls.join(";")],
  );

  return (
    <div {...props}>
      {calendar}
      {popoverInfo.event && popoverInfo.eventElement && (
        <CalendarEventPopover
          event={popoverInfo.event}
          isOpen={popoverInfo.opened}
          setIsOpen={setIsOpenCallback}
          eventElement={popoverInfo.eventElement}
        />
      )}
    </div>
  );
}

function renderEventListMonth({ event }: EventContentArg) {
  return (
    <div className="text-left">
      {event.title}{" "}
      <span className="text-inactive">{event.extendedProps.location}</span>
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
      className="h-full border-l-4 p-1 text-left"
      style={{
        borderLeftColor: border,
        backgroundColor: `color-mix(in srgb, ${background} 40%, transparent)`,
        color: `color-mix(in srgb, ${background} 75%, rgb(var(--color-text)))`,
      }}
    >
      <span
        className="line-clamp-2 text-sm font-medium"
        style={{
          color: `color-mix(in srgb, ${background} 60%, rgb(var(--color-text)))`,
        }}
      >
        {event.title}
      </span>
      {timeText && (
        <span className="line-clamp-2 text-xs text-opacity-50">
          {" "}
          {timeText}
        </span>
      )}
      <span className="line-clamp-2 text-xs">
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
      <div className="fc-event-title w-full max-w-full text-xs text-text-main">
        {event.title || <>&nbsp;</>}
      </div>
      {timeText && (
        <div className="ml-1 hidden w-fit text-right text-xs text-inactive @5xl/main:block">
          {timeText}
        </div>
      )}
    </div>
  );
}

function calculateWeek(date: Date) {
  // Calculate academic week number
  const semesterStart = new Date("2024-08-26").getTime(); // Monday, first day of first week
  const semesterEnd = new Date("2024-12-30").getTime(); // Monday, the day after the last week

  const time = date.getTime();
  if (time < semesterStart || time >= semesterEnd) {
    return Infinity; // Out of semester
  }

  const weekLength = 7 * 24 * 60 * 60 * 1000; // 7 days
  return Math.floor((time - semesterStart) / weekLength) + 1;
}
