"use client";
import CalendarEventPopover from "@/components/common/calendar/CalendarEventPopover";
import { EventApi, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import moment from "moment/moment";
import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import iCalendarPlugin from "./iCalendarPlugin";

export type URLType =
  | string
  | {
      url: string;
      color?: string;
    };

function Calendar({
  urls,
  initialView = "listMonth",
  viewId = "",
  ...props
}: {
  urls: URLType[];
  initialView?: string;
  viewId?: string;
}) {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<EventApi>();
  const [eventElement, setEventElement] = useState<HTMLElement>();

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
              },
        )} // Load events by url
        eventsSet={(events) => {
          // Remove duplicates.
          // Accumulate 'extendedProps.calendarURLs' to use it later.
          const unique: Record<string, EventApi> = {};
          for (const event of events) {
            const uniqueId =
              event.id || event.title + event.startStr + event.endStr;
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
          left: "prev title next",
          center: undefined,
          right: "listMonth timeGridWeek dayGridMonth",
        }}
        buttonText={{
          listMonth: "List",
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
          },
          timeGridWeek: {
            // Show weekday and date in day header
            dayHeaderFormat: "ddd D",
            eventContent: renderEventTimeGridWeek,
          },
          dayGridMonth: {
            eventContent: renderEventDayGridMonth,
          },
        }}
        allDayText="" // Remove text in all day row
        // displayEventEnd={true} // Display end time
        nowIndicator={true} // Display current time as line
        firstDay={1} // From Monday
        navLinks={false} // Dates are clickable
        weekNumbers={true} // Display numbers of weeks
        weekNumberFormat={{ week: "long" }} // Show "Week 1", not "W1"
        weekNumberClassNames="text-sm week-cell" // Small text size
        // weekNumberCalculation={calculateWeek} // Display academic week numbers
        // height="100dvh" // Full height
        contentHeight="auto" // Do not add scrollbar
        stickyHeaderDates={false}
        eventInteractive={true} // Make event tabbable
        eventClassNames="cursor-pointer text-sm" // Show that events are clickable
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          // We should check prev value via argument because 'eventElement' may be outdated in current closure
          setEventElement((prevElement) => {
            setPopoverOpened((prevOpened) => {
              if (!prevOpened) return true;
              return prevElement !== info.el;
            });
            return info.el;
          });
          setPopoverEvent(info.event);
        }}
        slotMinTime="07:00:00" // Cut everything earlier than 7am
        scrollTime="07:30:00" // Scroll to 7:30am on launch
        scrollTimeReset={false} // Do not reset scroll on date switch
        noEventsContent={() => "No events this month"} // Custom message
        viewDidMount={({ view }) => setCalendarView(view.type)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urls.join(";")],
  );

  return (
    <div {...props}>
      {calendar}
      {popoverEvent && eventElement && (
        <CalendarEventPopover
          event={popoverEvent}
          isOpen={popoverOpened}
          setIsOpen={setPopoverOpened}
          eventElement={eventElement}
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

function renderEventTimeGridWeek({ event }: EventContentArg) {
  return (
    <div className="h-full overflow-clip text-left">
      <span className="line-clamp-2">{event.title}</span>
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
      <div className="fc-event-title w-full max-w-full text-xs">
        {event.title || <>&nbsp;</>}
      </div>
      {timeText && (
        <div className="ml-1 hidden w-fit text-right text-xs text-inactive lg:block">
          {timeText}
        </div>
      )}
    </div>
  );
}

export default Calendar;
