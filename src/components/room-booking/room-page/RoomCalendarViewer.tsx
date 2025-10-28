import { $roomBooking } from "@/api/room-booking";
import CalendarEventPopover from "@/components/calendar/CalendarEventPopover.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import {
  DateSelectArg,
  DayHeaderContentArg,
  EventApi,
  EventContentArg,
  EventInput,
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
import "@/components/calendar/styles-calendar.css";
import type { Slot } from "../timeline/BookingTimeline.vue";

export default function RoomCalendarViewer({ roomId }: { roomId: string }) {
  const [popoverInfo, setPopoverInfo] = useState({
    opened: false,
    event: undefined as EventApi | undefined,
    eventElement: undefined as HTMLElement | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>(undefined);

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

  const startDate = useMemo(() => new Date(Date.now() - 7 * T.Day), []);
  const endDate = useMemo(() => new Date(Date.now() + 7 * T.Day), []); // 7 days from now
  const { data: bookings } = $roomBooking.useQuery(
    "get",
    "/room/{id}/bookings",
    {
      params: {
        path: {
          id: roomId,
        },
        query: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    },
    {
      // refetchInterval: 5 * T.Min,
    },
  );

  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");
  const room = rooms?.find((r) => r.id === roomId);

  const [calendarView, setCalendarView] = useState("timeGridWeek");

  const calendarRef = useRef<FullCalendar>(null);

  const handleSlotSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      if (!room) return;

      const slot: Slot = {
        room: {
          idx: 0,
          id: room.id,
          title: room.title,
          short_name: room.short_name,
          restrict_daytime: room.restrict_daytime,
        },
        start: new Date(selectInfo.startStr),
        end: new Date(selectInfo.endStr),
      };

      setSelectedSlot(slot);
      setBookingModalOpen(true);
    },
    [room],
  );

  const handleModalClose = useCallback((open: boolean) => {
    setBookingModalOpen(open);
    if (!open) {
      setSelectedSlot(undefined);
      // Clear the FullCalendar selection
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.unselect();
      }
    }
  }, []);

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
        progressiveEventRendering={true}
        timeZone="Europe/Moscow" // Use the same timezone for everyone
        plugins={[
          momentPlugin,
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
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
        height="auto"
        contentHeight="auto"
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
          },
          timeGridWeek: {
            eventContent: renderEventTimeGridWeek,
            dayHeaderContent: renderDayHeader,
            slotMinHeight: 40,
          },
          timeGrid3: {
            type: "timeGrid",
            dayCount: 3,
            eventContent: renderEventTimeGridWeek,
            dayHeaderContent: renderDayHeader,
            slotMinHeight: 40,
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
              <div className="bg-pagebg -mt-6 flex h-12 translate-y-2 items-center justify-end">
                {text}
              </div>
            );
          }
        }}
        firstDay={1} // From Monday
        navLinks={false} // Dates are clickable
        // height={isFullPage ? "100%" : undefined} // Full height
        // contentHeight={isFullPage ? undefined : "auto"} // Do not add scrollbar on in-page calendars
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
        selectable={true}
        selectMirror={true}
        selectOverlap={false}
        select={handleSlotSelect}
        longPressDelay={500}
        selectLongPressDelay={500}
        unselectAuto={false}
        unselectCancel=".fc-event"
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSlotSelect, handleModalClose],
  );

  useEffect(() => {
    if (!bookings) return;

    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    // Run in the next tick
    setTimeout(() => {
      if (!bookings) return;

      const prevEvents: EventApi[] = calendarApi.getEvents();
      const eventsToGet: EventInput[] = bookings.map((booking) => ({
        title: booking.title,
        start: booking.start,
        end: booking.end,
        color: "cyan",
      }));

      // Remove old sources that are not in the list
      for (const event of prevEvents) {
        // Check if the source is in the list of sources to get
        const found = eventsToGet.find(
          (source) =>
            source.start === event.start &&
            source.end === event.end &&
            source.title === event.title,
        );
        if (!found) {
          event.remove();
        }
      }

      // Add new sources
      for (const event of eventsToGet) {
        // Check if the source is already in the calendar
        const found = prevEvents.find(
          (source) =>
            source.start === event.start &&
            source.end === event.end &&
            source.title === event.title,
        );
        if (!found) {
          calendarApi.addEvent(event);
        }
      }
    });
  }, [bookings]);

  return (
    <div className={clsx("overflow-clip", isLoading && "calendar-loading")}>
      {calendarComponent}
      {popoverInfo.event && popoverInfo.eventElement && (
        <CalendarEventPopover
          event={popoverInfo.event}
          isOpen={popoverInfo.opened}
          setIsOpen={setIsOpenCallback}
          eventElement={popoverInfo.eventElement}
        />
      )}
      <BookingModal
        newSlot={selectedSlot}
        open={bookingModalOpen}
        onOpenChange={handleModalClose}
      />
    </div>
  );
}

function renderEventListMonth({ event }: EventContentArg) {
  return (
    <div className="flex flex-wrap gap-x-1 text-left">
      {event.title}
      <span className="text-inactive break-all">
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
        color: `color-mix(in srgb, ${background} 75%, var(--color-contrast))`,
      }}
    >
      <span
        className="line-clamp-2 text-sm font-medium"
        style={{
          color: `color-mix(in srgb, ${background} 60%, var(--color-contrast))`,
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
      <div className="fc-event-title text-contrast w-full max-w-full text-xs">
        {event.title || <>&nbsp;</>}
      </div>
      {timeText && (
        <div className="text-inactive ml-1 hidden w-fit text-right text-xs @5xl/content:block">
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
      <div className="inline-flex w-fit items-center justify-center rounded-md in-[.fc-day-today]:bg-red-500 in-[.fc-day-today]:px-1 in-[.fc-day-today]:text-white">
        {moment(date).format("D")}
      </div>
    </>
  );
}
