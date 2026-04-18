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
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  // useMemo,
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

/**
 * Moscow is UTC+3. FullCalendar 6 with 'Europe/Moscow' returns shifted Date objects
 * where the 'wall clock' time is represented as UTC.
 * We subtract 3 hours to get the real UTC timestamp.
 */
function fromCalendarDate(d: Date): Date {
  return new Date(d.getTime() - 3 * 3600 * 1000);
}

/**
 * Converts a real UTC timestamp to the shifted 'Calendar Space' (Moscow Wall Clock as UTC).
 
function toCalendarDate(d: Date | number): Date {
  const ms = typeof d === "number" ? d : d.getTime();
  return new Date(ms + 3 * 3600 * 1000);
}
*/
type BookingDraft =
  | { phase: "preview"; start: Date; end: Date }
  | { phase: "dragging"; start: Date; end: Date };

type DraftDragAnchor = "top" | "bottom";

const DRAFT_SLOT_STEP_MS = DRAFT_SLOT_MS;

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

function roundToNearestStepMs(ms: number, stepMs: number) {
  return Math.round(ms / stepMs) * stepMs;
}

function roundUpToStepMs(ms: number, stepMs: number) {
  return Math.ceil(ms / stepMs) * stepMs;
}

function hasBookingsOverlap(
  startMs: number,
  endMs: number,
  bookings:
    | {
        start: string;
        end: string;
      }[]
    | undefined,
) {
  if (!bookings?.length) return false;

  return bookings.some((booking) => {
    const bStart = moment(booking.start).valueOf();
    const bEnd = moment(booking.end).valueOf();
    // Check for intersection: draft start is before booking end AND draft end is after booking start
    return startMs < bEnd && endMs > bStart;
  });
}

function formatDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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
          // Send real UTC to API
          start: fromCalendarDate(dateRange.startDate).toISOString(),
          end: fromCalendarDate(dateRange.endDate).toISOString(),
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

  const [calendarView, setCalendarView] = useState("timeGrid3");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const dragStateRef = useRef<{
    anchor: DraftDragAnchor;
    pointerId: number;
    startY: number;
    initialStartMs: number;
    initialEndMs: number;
    slotHeightPx: number;
  } | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  const narrowForTapBooking = useNarrowScreenForTapBooking();
  const tapTwoStepTimeGrid =
    narrowForTapBooking && calendarView.startsWith("timeGrid");

  const clearBookingDraft = useCallback(() => {
    setBookingDraft(null);
    dragStateRef.current = null;
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
        // selectInfo already provides shifted dates, normalize them for the modal
        start: fromCalendarDate(new Date(selectInfo.startStr)),
        end: fromCalendarDate(new Date(selectInfo.endStr)),
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

      // clickedMs is in 'Calendar Space' (Moscow Wall Clock as UTC)
      const clickedMs = roundToNearestStepMs(
        arg.date.getTime(),
        DRAFT_SLOT_STEP_MS,
      );

      // nowMs in 'Calendar Space'
      const nowMs = Date.now() + 3 * 3600 * 1000;
      const nowFloorMs = roundUpToStepMs(nowMs, DRAFT_SLOT_STEP_MS);

      if (clickedMs < nowFloorMs) return;

      // For overlap check, use real UTC
      const clickedUtcMs = clickedMs - 3 * 3600 * 1000;
      if (
        hasBookingsOverlap(clickedUtcMs, clickedUtcMs + DRAFT_SLOT_MS, bookings)
      ) {
        return;
      }

      const clicked = new Date(clickedMs);

      setBookingDraft((_prev) => {
        // Re-tapping the grid repositions the preview to a fresh 30-minute slot.
        return {
          phase: "preview",
          start: clicked,
          end: addDraftSlotMs(clicked),
        };
      });
    },
    [narrowForTapBooking, room, bookingModalOpen, bookings],
  );

  const handleDraftDragStart = useCallback(
    (anchor: DraftDragAnchor, pointerId: number, clientY: number) => {
      if (!bookingDraft) return;
      const slotEl = document.querySelector(
        ".fc-timegrid-slot",
      ) as HTMLElement | null;
      const slotHeightPx = slotEl?.getBoundingClientRect().height || 20;

      dragStateRef.current = {
        anchor,
        pointerId,
        startY: clientY,
        initialStartMs: bookingDraft.start.getTime(),
        initialEndMs: bookingDraft.end.getTime(),
        slotHeightPx: Math.max(1, slotHeightPx),
      };
      setBookingDraft({
        phase: "dragging",
        start: bookingDraft.start,
        end: bookingDraft.end,
      });
    },
    [bookingDraft],
  );

  const handleDraftPointerDown = useCallback(
    (anchor: DraftDragAnchor, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      handleDraftDragStart(anchor, event.pointerId, event.clientY);
    },
    [handleDraftDragStart],
  );

  const renderTimeGridEvent = useCallback(
    (arg: EventContentArg) => {
      if (arg.event.extendedProps.isDraft) {
        const durationLabel = arg.event.extendedProps.durationLabel as
          | string
          | undefined;

        const start = arg.event.start;
        const end = arg.event.end;
        const is30m =
          start && end && end.getTime() - start.getTime() <= DRAFT_SLOT_STEP_MS;

        return (
          <div
            className="pointer-events-auto relative flex h-full items-center justify-center rounded-md border px-3 py-2 text-center"
            style={{ backgroundColor: "#2D0363", borderColor: "#5E15BC" }}
          >
            {/* Top and bottom bars aligned with edges */}
            <div
              className="absolute top-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-b-full"
              style={{ backgroundColor: "#5E15BC" }}
            />
            <div
              className="absolute bottom-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-t-full"
              style={{ backgroundColor: "#5E15BC" }}
            />

            <button
              type="button"
              data-draft-anchor="top"
              aria-label="Adjust booking start by dragging top edge"
              className="absolute top-0 right-0 left-0 z-10 h-1/2 cursor-ns-resize touch-none bg-transparent"
              style={{ touchAction: "none" }}
              onPointerDown={(event) => handleDraftPointerDown("top", event)}
            />
            <button
              type="button"
              data-draft-anchor="bottom"
              aria-label="Adjust booking end by dragging bottom edge"
              className="absolute right-0 bottom-0 left-0 z-10 h-1/2 cursor-ns-resize touch-none bg-transparent"
              style={{ touchAction: "none" }}
              onPointerDown={(event) => handleDraftPointerDown("bottom", event)}
            />
            {!is30m && (
              <span className="pointer-events-none px-2 text-xs font-semibold text-white">
                {durationLabel || "30m"}
              </span>
            )}
          </div>
        );
      }

      return renderEventTimeGridWeekRegular(arg);
    },
    [handleDraftPointerDown],
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      if (event.pointerId !== dragState.pointerId) return;
      if (event.cancelable) event.preventDefault();

      const stepCount = Math.round(
        (event.clientY - dragState.startY) / dragState.slotHeightPx,
      );
      const diffMs = stepCount * DRAFT_SLOT_STEP_MS;

      const nowMs = Date.now() + 3 * 3600 * 1000;
      const nowFloorMs = roundUpToStepMs(nowMs, DRAFT_SLOT_STEP_MS);

      setBookingDraft((prev) => {
        if (!prev) return prev;

        // If the initial tile was exactly 30 minutes, allow dragging in either direction to expand.
        const isInitial30m =
          dragState.initialEndMs - dragState.initialStartMs ===
          DRAFT_SLOT_STEP_MS;
        let effectiveAnchor = dragState.anchor;
        if (isInitial30m) {
          if (diffMs < 0) effectiveAnchor = "top";
          else if (diffMs > 0) effectiveAnchor = "bottom";
        }

        if (effectiveAnchor === "top") {
          const tentativeStart = roundToNearestStepMs(
            dragState.initialStartMs + diffMs,
            DRAFT_SLOT_STEP_MS,
          );
          const minStartLimit = Math.max(
            nowFloorMs,
            dragState.initialEndMs - DRAFT_SLOT_MAX_MS,
          );
          const maxStartLimit = dragState.initialEndMs - DRAFT_SLOT_MS;

          let nextStart = Math.min(
            Math.max(tentativeStart, minStartLimit),
            maxStartLimit,
          );

          // Clamp by bookings: convert to real UTC for comparison
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf();
              const bEnd = moment(b.end).valueOf();

              // Shift back to real UTC for overlap check
              const nextStartUtc = nextStart - 3 * 3600 * 1000;
              const fixedEndUtc = dragState.initialEndMs - 3 * 3600 * 1000;

              if (nextStartUtc < bEnd && fixedEndUtc > bStart) {
                // Shift booking end forward to calendar space for clamping
                nextStart = Math.max(nextStart, bEnd + 3 * 3600 * 1000);
              }
            }
          }

          if (nextStart > maxStartLimit) nextStart = maxStartLimit;

          return {
            phase: "dragging",
            start: new Date(nextStart),
            end: new Date(dragState.initialEndMs),
          };
        } else {
          const tentativeEnd = roundToNearestStepMs(
            dragState.initialEndMs + diffMs,
            DRAFT_SLOT_STEP_MS,
          );
          const minEndLimit = dragState.initialStartMs + DRAFT_SLOT_MS;
          const maxEndLimit = dragState.initialStartMs + DRAFT_SLOT_MAX_MS;

          let nextEnd = Math.max(
            minEndLimit,
            Math.min(maxEndLimit, tentativeEnd),
          );

          // Clamp by bookings
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf();
              const bEnd = moment(b.end).valueOf();

              // Shift back to real UTC
              const fixedStartUtc = dragState.initialStartMs - 3 * 3600 * 1000;
              const nextEndUtc = nextEnd - 3 * 3600 * 1000;

              if (fixedStartUtc < bEnd && nextEndUtc > bStart) {
                // Shift booking start forward to calendar space
                nextEnd = Math.min(nextEnd, bStart + 3 * 3600 * 1000);
              }
            }
          }

          if (nextEnd < minEndLimit) nextEnd = minEndLimit;

          return {
            phase: "dragging",
            start: new Date(dragState.initialStartMs),
            end: new Date(nextEnd),
          };
        }
      });
    }

    function handlePointerRelease(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      if (event.pointerId !== dragState.pointerId) return;
      dragStateRef.current = null;
      setBookingDraft((prev) => {
        if (!prev) return prev;
        return { phase: "preview", start: prev.start, end: prev.end };
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerRelease);
    window.addEventListener("pointercancel", handlePointerRelease);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerRelease);
      window.removeEventListener("pointercancel", handlePointerRelease);
    };
  }, [bookings]);

  const handleDraftBook = useCallback(() => {
    if (!room || !bookingDraft) return;

    // Normalize to real UTC before sending to modal
    const start = fromCalendarDate(bookingDraft.start);
    const end = fromCalendarDate(bookingDraft.end);

    if (start.getTime() < Date.now()) return;

    const slot: Slot = {
      room: {
        idx: 0,
        id: room.id,
        title: room.title,
        short_name: room.short_name,
        restrict_daytime: room.restrict_daytime,
      },
      start,
      end,
    };

    setSelectedSlot(slot);
    setSelectedBookingDetails(undefined);
    setBookingModalOpen(true);
    setBookingDraft(null);
    calendarRef.current?.getApi().getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
  }, [room, bookingDraft]);

  // const draftDurationLabel = useMemo(() => {
  //   if (!bookingDraft) return "";
  //   return formatDuration(bookingDraft.start, bookingDraft.end);
  // }, [bookingDraft]);

  useEffect(() => {
    if (!bookingDraft || !room) return;

    const api = calendarRef.current?.getApi();
    if (!api) return;

    const durationLabel = formatDuration(bookingDraft.start, bookingDraft.end);
    const draftEvent = api.getEventById(DRAFT_SLOT_EVENT_ID);
    if (draftEvent) {
      draftEvent.setDates(bookingDraft.start, bookingDraft.end);
      draftEvent.setExtendedProp("durationLabel", durationLabel);
      return;
    }

    api.addEvent({
      id: DRAFT_SLOT_EVENT_ID,
      title: "New booking",
      start: bookingDraft.start,
      end: bookingDraft.end,
      display: "block",
      extendedProps: {
        isDraft: true,
        durationLabel,
      },
      color: "#9A2EFF",
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
            eventContent: renderTimeGridEvent,
            dayHeaderContent: renderDayHeader,
            slotMinHeight: 40,
          },
          timeGrid3: {
            type: "timeGrid",
            dayCount: 3,
            eventContent: renderTimeGridEvent,
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

          // arg.date is already shifted to Moscow wall clock (represented as UTC).
          const text = moment.utc(arg.date).format("HH:mm");

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
            arg.event.extendedProps.isDraft && "!cursor-default rounded-md!",
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
          {bookingDraft.phase === "preview" && (
            <p className="text-base-content/80 mb-3 text-center text-sm">
              Drag tile edges to set start/end time.
            </p>
          )}
          {/*           
          <p className="text-base-content/80 mb-3 text-center text-sm">
            Duration: {draftDurationLabel}
          </p> */}
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

function renderEventTimeGridWeekRegular({
  event,
  borderColor,
  backgroundColor,
  timeText,
}: EventContentArg) {
  if (event.extendedProps.isDraft) {
    const durationLabel = event.extendedProps.durationLabel as
      | string
      | undefined;
    const start = event.start;
    const end = event.end;
    const is30m =
      start && end && end.getTime() - start.getTime() <= DRAFT_SLOT_STEP_MS;

    return (
      <div
        className="pointer-events-auto relative flex h-full items-center justify-center rounded-md border px-3 py-2 text-center"
        style={{ backgroundColor: "#2D0363", borderColor: "#5E15BC" }}
      >
        {/* Top and bottom bars aligned with edges */}
        <div
          className="absolute top-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-b-full"
          style={{ backgroundColor: "#5E15BC" }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-t-full"
          style={{ backgroundColor: "#5E15BC" }}
        />

        <button
          type="button"
          data-draft-anchor="top"
          aria-label="Adjust booking start by dragging top edge"
          className="absolute top-0 right-0 left-0 z-10 h-1/2 cursor-ns-resize touch-none bg-transparent"
        />
        <button
          type="button"
          data-draft-anchor="bottom"
          aria-label="Adjust booking end by dragging bottom edge"
          className="absolute right-0 bottom-0 left-0 z-10 h-1/2 cursor-ns-resize touch-none bg-transparent"
        />
        {!is30m && (
          <span className="pointer-events-none px-2 text-xs font-semibold text-white">
            {durationLabel || "30m"}
          </span>
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
