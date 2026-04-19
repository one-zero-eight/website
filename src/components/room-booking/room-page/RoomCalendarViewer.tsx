import { $roomBooking } from "@/api/room-booking";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import {
  DateSelectArg,
  DayHeaderContentArg,
  EventApi,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import clsx from "clsx";
import moment from "moment/moment";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import "@/components/calendar/styles-calendar.css";
import { type Booking, schemaToBooking, type Slot } from "../timeline/types.ts";
import { getTimeRangeForWeek, sanitizeBookingTitle } from "../utils.ts";

/** Synthetic FullCalendar event id for the mobile two-tap booking preview. */
const DRAFT_SLOT_EVENT_ID = "room-calendar-draft-slot";
const DRAFT_SLOT_MS = 30 * 60 * 1000;
const DRAFT_SLOT_MAX_MS = 3 * 60 * 60 * 1000;
const MOBILE_TAP_BOOKING_MAX_WIDTH_PX = 767;

type BookingDraft =
  | { phase: "awaiting_end"; start: Date; end: Date }
  | { phase: "complete"; start: Date; end: Date };

function useNarrowScreenForTapBooking() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      const mq = window.matchMedia(
        `(max-width: ${MOBILE_TAP_BOOKING_MAX_WIDTH_PX}px)`,
      );
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(max-width: ${MOBILE_TAP_BOOKING_MAX_WIDTH_PX}px)`)
        .matches,
    () => false,
  );
}

function addDraftSlotMs(d: Date) {
  return new Date(d.getTime() + DRAFT_SLOT_MS);
}

function clampDraftDurationMs(durationMs: number) {
  return Math.max(DRAFT_SLOT_MS, Math.min(DRAFT_SLOT_MAX_MS, durationMs));
}

export default function RoomCalendarViewer({ roomId }: { roomId: string }) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>(undefined);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<
    Booking | undefined
  >(undefined);

  const [dateRange, setDateRange] = useState(getTimeRangeForWeek());
  const { data: bookings, isPending } = $roomBooking.useQuery(
    "get",
    "/room/{id}/bookings",
    {
      params: {
        path: {
          id: roomId,
        },
        query: {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString(),
        },
      },
    },
    {
      refetchInterval: 5 * T.Min,
      retry: 5,
      retryDelay: 2 * T.Sec,
    },
  );

  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: { query: { include_red: true } },
  });
  const room = rooms?.find((r) => r.id === roomId);

  const [calendarView, setCalendarView] = useState("timeGridWeek");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  const narrowForTapBooking = useNarrowScreenForTapBooking();
  const tapTwoStepTimeGrid =
    narrowForTapBooking && calendarView.startsWith("timeGrid");

  const clearBookingDraft = useCallback(() => {
    setBookingDraft(null);
    const api = calendarRef.current?.getApi();
    api?.getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
  }, []);

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
      setSelectedBookingDetails(undefined);
      setBookingModalOpen(true);
    },
    [room],
  );

  const handleModalClose = useCallback((open: boolean) => {
    setBookingModalOpen(open);
    if (!open) {
      setSelectedSlot(undefined);
      setSelectedBookingDetails(undefined);
      setBookingDraft(null);
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.unselect();
        calendarApi.getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
      }
    }
  }, []);

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (!narrowForTapBooking) return;
      if (!arg.view.type.startsWith("timeGrid")) return;
      if (arg.allDay || !room) return;
      if (bookingModalOpen) return;

      const clicked = arg.date;

      setBookingDraft((prev) => {
        if (!prev) {
          return {
            phase: "awaiting_end",
            start: clicked,
            end: addDraftSlotMs(clicked),
          };
        }

        // If the user taps earlier than the current start, treat this as a new start
        // and reset to "awaiting end" with the default 30-minute preview.
        if (clicked.getTime() <= prev.start.getTime()) {
          return {
            phase: "awaiting_end",
            start: clicked,
            end: addDraftSlotMs(clicked),
          };
        }

        // The second point is the end boundary of the tapped slot.
        const nextEnd = addDraftSlotMs(clicked);
        const durationMs = nextEnd.getTime() - prev.start.getTime();
        if (durationMs > DRAFT_SLOT_MAX_MS) {
          return {
            phase: "awaiting_end",
            start: clicked,
            end: addDraftSlotMs(clicked),
          };
        }

        const end = new Date(
          prev.start.getTime() + clampDraftDurationMs(durationMs),
        );

        return { phase: "complete", start: prev.start, end };
      });
    },
    [narrowForTapBooking, room, bookingModalOpen],
  );

  const handleDraftBook = useCallback(() => {
    if (!room || !bookingDraft) return;

    const slot: Slot = {
      room: {
        idx: 0,
        id: room.id,
        title: room.title,
        short_name: room.short_name,
        restrict_daytime: room.restrict_daytime,
      },
      start: bookingDraft.start,
      end: bookingDraft.end,
    };

    setSelectedSlot(slot);
    setSelectedBookingDetails(undefined);
    setBookingModalOpen(true);
    setBookingDraft(null);
    calendarRef.current?.getApi().getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
  }, [room, bookingDraft]);

  useEffect(() => {
    if (!bookingDraft || !room) return;

    const api = calendarRef.current?.getApi();
    if (!api) return;

    queueMicrotask(() => {
      const current = calendarRef.current?.getApi();
      if (!current) return;
      current.getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
      current.addEvent({
        id: DRAFT_SLOT_EVENT_ID,
        title: "New booking",
        start: bookingDraft.start,
        end: bookingDraft.end,
        display: "block",
        extendedProps: { isDraft: true },
        color: "#9A2EFF",
      });
    });
  }, [bookingDraft, room]);

  useEffect(() => {
    if (!bookingDraft) return;

    if (!calendarView.startsWith("timeGrid")) {
      setBookingDraft(null);
      calendarRef.current?.getApi().getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
      return;
    }

    const vs = dateRange.startDate.getTime();
    const ve = dateRange.endDate.getTime();
    if (
      bookingDraft.start.getTime() >= ve ||
      bookingDraft.end.getTime() <= vs
    ) {
      setBookingDraft(null);
      calendarRef.current?.getApi().getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
    }
  }, [calendarView, dateRange, bookingDraft]);

  useEffect(() => {
    if (!bookings) return;

    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    // Run in the next tick
    setTimeout(() => {
      if (!bookings) return;

      const prevEvents: EventApi[] = calendarApi.getEvents();
      const eventsToGet: EventInput[] = bookings.map((booking) => ({
        title: sanitizeBookingTitle(booking.title),
        start: booking.start,
        end: booking.end,
        color: booking.related_to_me ? "seagreen" : undefined,
        extendedProps: {
          booking: booking,
        },
      }));

      // Remove old sources that are not in the list
      for (const event of prevEvents) {
        if (event.id === DRAFT_SLOT_EVENT_ID) continue;
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
    <div
      className={clsx(
        "relative overflow-clip",
        isPending && "calendar-loading",
        bookingDraft && "pb-28",
      )}
    >
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
        slotDuration="00:30:00"
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
              <div className="bg-base-100 -mt-6 flex h-12 translate-y-2 items-center justify-end">
                {text}
              </div>
            );
          }
        }}
        firstDay={1} // From Monday
        navLinks={false} // Dates are clickable
        eventInteractive={true} // Make event tabbable
        expandRows={true}
        eventClassNames={(arg) =>
          clsx(
            "cursor-pointer text-sm rounded-md! bg-transparent! border-0! overflow-clip",
            arg.event.extendedProps.isDraft &&
              "pointer-events-none !cursor-default rounded-md! border border-primary/60! bg-primary/15!",
          )
        }
        dateClick={handleDateClick}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          info.jsEvent.stopPropagation();
          if (info.event.extendedProps.isDraft) return;
          const booking = info.event.extendedProps.booking;
          if (!booking) return;
          clearBookingDraft();
          setSelectedSlot(undefined);
          setSelectedBookingDetails(schemaToBooking(booking));
          setBookingModalOpen(true);
        }}
        scrollTime="07:30:00" // Scroll to 7:30am on launch
        scrollTimeReset={false} // Do not reset scroll on date switch
        noEventsContent={() => "No events this month"} // Custom message
        datesSet={({ view, start, end }) => {
          setCalendarView(view.type);
          if (start && end) {
            setDateRange({ startDate: start, endDate: end });
          }
        }}
        selectable={!tapTwoStepTimeGrid}
        selectMirror={!tapTwoStepTimeGrid}
        selectOverlap={false}
        select={handleSlotSelect}
        longPressDelay={500}
        selectLongPressDelay={500}
        unselectAuto={false}
        unselectCancel=".fc-event"
      />
      {bookingDraft && (
        <div className="bg-base-200/95 border-base-300 fixed right-0 bottom-0 left-0 z-20 border-t px-3 pt-3 shadow-lg backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {bookingDraft.phase === "awaiting_end" && (
            <p className="text-base-content/80 mb-3 text-center text-sm">
              Tap the calendar again to choose when your booking ends.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
            <button
              type="button"
              className="btn btn-outline btn-sm min-w-[6rem]"
              onClick={clearBookingDraft}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-w-[6rem]"
              onClick={handleDraftBook}
            >
              Book
            </button>
          </div>
        </div>
      )}
      <BookingModal
        newSlot={selectedSlot}
        detailsBooking={selectedBookingDetails}
        open={bookingModalOpen}
        onOpenChange={handleModalClose}
        onBookingCreated={(data) => {
          setSelectedSlot(undefined);
          setSelectedBookingDetails(data);
        }}
      />
    </div>
  );
}

function renderEventListMonth({ event }: EventContentArg) {
  return (
    <div className="flex flex-wrap gap-x-1 text-left">
      {event.title}
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
  if (event.extendedProps.isDraft) {
    return (
      <div className="border-primary text-base-content/90 bg-primary/20 h-full border-l-4 p-1 text-left">
        <span className="text-sm font-medium">New booking</span>
        {timeText && (
          <span className="text-base-content/60 block text-xs">{timeText}</span>
        )}
      </div>
    );
  }

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
      <div className="inline-flex w-fit items-center justify-center rounded-md in-[.fc-day-today]:bg-red-500 in-[.fc-day-today]:px-1 in-[.fc-day-today]:text-white">
        {moment(date).format("D")}
      </div>
    </>
  );
}
