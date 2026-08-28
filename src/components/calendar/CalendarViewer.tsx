import type { EventInput } from "@fullcalendar/core";
import { scheduleTypes } from "@/api/schedule";
import CalendarEventPopover, {
  ScheduleDialogProps,
} from "@/components/calendar/CalendarEventPopover.tsx";
import { ConfigCalendarDialog } from "@/components/calendar/ConfigCalendarDialog.tsx";
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
import { cn } from "@/lib/ui/cn";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import moment from "moment/moment";
import {
  ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocalStorage, useMediaQuery } from "usehooks-ts";
import iCalendarPlugin from "./iCalendarPlugin";
import { WHEN2MEET_EVENT_ID_PREFIX } from "./when2meet-events.ts";
import "./styles-calendar.css";

export type CalendarView = {
  id: string;
  displayName: string;
};

export type CalendarCustomView = CalendarView & {
  component: ComponentType<{ date: Date }>;
};

const defaultViews: CalendarView[] = [
  { id: "timeGrid3", displayName: "3 days" },
  { id: "timeGridWeek", displayName: "Week" },
  { id: "dayGridMonth", displayName: "Month" },
  { id: "listMonth", displayName: "List" },
];

export type URLType =
  | string
  | {
      url: string;
      color?: string;
      sourceLink?: string;
      updatedAt?: string;
      eventGroup?: scheduleTypes.SchemaViewEventGroup;
    };

export function CalendarViewer({
  urls,
  extraEvents = [],
  initialView = "listMonth",
  viewId = "",
  isFullPage = false,
  EventPopover = CalendarEventPopover,
  views = defaultViews.map(({ id }) => id),
  customViews = [],
}: {
  urls: URLType[];
  extraEvents?: EventInput[];
  initialView?: string;
  viewId?: string;
  isFullPage?: boolean;
  EventPopover?: ComponentType<ScheduleDialogProps>;
  views?: string[];
  customViews?: CalendarCustomView[];
}) {
  const { academicCalendar } = useMyAcademicCalendar();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const academicCalendarRef = useRef(academicCalendar);
  useEffect(() => {
    academicCalendarRef.current = academicCalendar;
  }, [academicCalendar]);

  const availableViews = useMemo(() => {
    const builtInViews = new Map(
      defaultViews.map((view) => [view.id, view] as const),
    );

    return [
      ...views.flatMap((viewId) => {
        const view = builtInViews.get(viewId);
        return view ? [view] : [];
      }),
      ...customViews,
    ];
  }, [customViews, views]);
  const availableViewIds = useMemo(
    () => availableViews.map(({ id }) => id),
    [availableViews],
  );
  const firstAvailableView = availableViewIds[0] ?? "dayGridMonth";
  const fallbackInitialView = availableViewIds.includes(initialView)
    ? initialView
    : firstAvailableView;
  const builtInInitialView = defaultViews.some(
    ({ id }) => id === fallbackInitialView,
  )
    ? fallbackInitialView
    : "dayGridMonth";

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
    fallbackInitialView,
  );
  const [calendarView, setCalendarView] = useState(
    availableViewIds.includes(storedCalendarView)
      ? storedCalendarView
      : fallbackInitialView,
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!availableViewIds.includes(calendarView)) {
      setCalendarView(fallbackInitialView);
      return;
    }
    setStoredCalendarView(calendarView);
  }, [
    availableViewIds,
    calendarView,
    fallbackInitialView,
    setStoredCalendarView,
  ]);

  const calendarRef = useRef<FullCalendar>(null);

  const handleChangeView = (viewId: string) => {
    if (viewId === calendarView) {
      return;
    }

    if (defaultViews.some((view) => view.id === viewId)) {
      calendarRef.current?.getApi().changeView(viewId);
    }
    setCalendarView(viewId);
  };

  const handlePrevious = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

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
        initialView={builtInInitialView} // Default view
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
        headerToolbar={false}
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
            weekNumbers: !isMobile,
          },
          timeGrid3: {
            type: "timeGrid",
            dayCount: 3,
            eventContent: renderEventTimeGridWeek,
            dayHeaderContent: renderDayHeader,
            weekNumbers: !isMobile,
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
        weekNumbers={!isMobile} // Display numbers of weeks
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
        datesSet={({ view }) => {
          // Bail out when the range didn't change: 'view.currentStart' is a fresh
          // Date on every call, so without this comparison the component would
          // re-render on each 'datesSet' (new props -> resetOptions -> datesSet).
          setCurrentDate((prev) =>
            prev.getTime() === view.currentStart.getTime()
              ? prev
              : view.currentStart,
          );
        }}
        loading={setIsLoading}
      />
    ),
    [builtInInitialView, initialView, isFullPage, isMobile],
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

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) {
      return;
    }

    setTimeout(() => {
      const prevEvents = calendarApi.getEvents();
      const nextEventIds = new Set(
        extraEvents.map((event) => event.id).filter(Boolean) as string[],
      );

      for (const event of prevEvents) {
        if (
          event.id?.startsWith(WHEN2MEET_EVENT_ID_PREFIX) &&
          !nextEventIds.has(event.id)
        ) {
          event.remove();
        }
      }

      for (const eventInput of extraEvents) {
        const existingEvent = eventInput.id
          ? calendarApi.getEventById(eventInput.id)
          : null;

        if (existingEvent) {
          existingEvent.remove();
        }

        calendarApi.addEvent(eventInput);
      }
    });
  }, [extraEvents, isFullPage]);

  const customViewIds = useMemo(
    () => new Set(customViews.map(({ id }) => id)),
    [customViews],
  );
  const isCustomView = customViewIds.has(calendarView);

  return (
    <div
      className={cn(
        isFullPage ? "flex h-full flex-col overflow-clip" : "",
        isLoading && "calendar-loading",
      )}
    >
      <div className="flex flex-none flex-nowrap items-center justify-between gap-2 overflow-x-auto px-4 pt-3 pb-4">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn btn-sm rounded-xl"
            onClick={handlePrevious}
          >
            <span className="icon-[material-symbols--chevron-left] text-xl" />
          </button>
          <h2 className="min-w-32 text-center text-base font-normal">
            {moment(currentDate).format(
              currentDate.getFullYear() === new Date().getFullYear()
                ? calendarView === "listMonth"
                  ? "MMM"
                  : "MMMM"
                : "MMMM YYYY",
            )}
          </h2>
          <button
            type="button"
            className="btn btn-sm rounded-xl"
            onClick={handleNext}
          >
            <span className="icon-[material-symbols--chevron-right] text-xl" />
          </button>
          <button
            type="button"
            className="btn btn-sm hidden rounded-xl sm:inline-flex"
            onClick={handleToday}
          >
            Today
          </button>
        </div>
        <div className="join hidden shrink-0 sm:flex">
          {availableViews.map((view) => (
            <button
              key={view.id}
              type="button"
              className={cn(
                "btn btn-sm join-item",
                calendarView === view.id && "btn-active",
              )}
              onClick={() => handleChangeView(view.id)}
            >
              {view.displayName}
            </button>
          ))}
        </div>
        {isFullPage && (
          <button
            type="button"
            className="btn btn-sm hidden shrink-0 rounded-xl sm:inline-flex"
            onClick={() => setSourcesDialogOpen(true)}
          >
            <span className="icon-[material-symbols--settings-outline] text-xl" />
            Config & Export
          </button>
        )}
        <CalendarControlMenu
          className="sm:hidden"
          views={availableViews}
          currentView={calendarView}
          onSelectView={handleChangeView}
          onToday={handleToday}
          onConfigExport={() => setSourcesDialogOpen(true)}
          showConfig={isFullPage}
        />
      </div>
      <div className={cn("min-h-0 flex-1", isCustomView && "hidden")}>
        {calendarComponent}
      </div>
      {customViews.map(({ id, component: CustomView }) =>
        calendarView === id ? <CustomView key={id} date={currentDate} /> : null,
      )}
      {popoverInfo.event && popoverInfo.eventElement && (
        <EventPopover
          event={popoverInfo.event}
          isOpen={popoverInfo.opened}
          setIsOpen={setIsOpenCallback}
          eventElement={popoverInfo.eventElement}
        />
      )}
      <ConfigCalendarDialog
        open={sourcesDialogOpen}
        onOpenChange={setSourcesDialogOpen}
      />
    </div>
  );
}

function CalendarControlMenu({
  views,
  currentView,
  onSelectView,
  onToday,
  onConfigExport,
  showConfig,
  className,
}: {
  views: CalendarView[];
  currentView: string;
  onSelectView: (viewId: string) => void;
  onToday: () => void;
  onConfigExport?: () => void;
  showConfig: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 50,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        className={cn("btn btn-sm shrink-0 rounded-xl", className)}
        {...getReferenceProps()}
      >
        <span className="icon-[material-symbols--menu] text-xl" />
      </button>

      {isMounted && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
            className="bg-base-100 border-base-300 z-[100] flex w-48 flex-col gap-1 rounded-xl border p-1 pt-2 shadow-lg"
          >
            <button
              type="button"
              className="btn btn-sm btn-ghost justify-start"
              onClick={() => {
                onToday();
                setIsOpen(false);
              }}
            >
              Go today
            </button>

            <div className="bg-base-300 my-1 h-px" />

            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                className={cn(
                  "btn btn-sm btn-ghost justify-start",
                  currentView === view.id && "btn-active",
                )}
                onClick={() => {
                  onSelectView(view.id);
                  setIsOpen(false);
                }}
              >
                {view.displayName}
              </button>
            ))}

            {showConfig && onConfigExport && (
              <>
                <div className="bg-base-300 my-1 h-px" />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost justify-start"
                  onClick={() => {
                    onConfigExport();
                    setIsOpen(false);
                  }}
                >
                  <span className="icon-[material-symbols--settings-outline] text-lg" />
                  Config & Export
                </button>
              </>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

function renderEventListMonth({ event }: EventContentArg) {
  // FullCalendar list view marks rows with `.fc-event-forced-url` when the event
  // has a URL, then on click does `querySelector('a[href]').href`. Custom
  // eventContent must keep an anchor or that click handler throws and eventClick
  // never runs (events.ics includes URL; schedule feeds often don't).
  return (
    <div className="flex flex-wrap gap-x-1 text-left">
      {event.url ? <a href={event.url}>{event.title}</a> : event.title}
      <span className="text-base-content/30 break-all">
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
        className={cn(
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
        <div className="text-base-content/30 ml-1 hidden w-fit text-right text-xs @5xl/content:block">
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
