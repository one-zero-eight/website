import { $roomBooking } from "@/api/room-booking";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import {
  DateSelectArg,
  DayHeaderContentArg,
  DatesSetArg,
  EventApi,
  EventClickArg,
  EventContentArg,
  EventInput,
  NowIndicatorContentArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import momentPlugin from "@fullcalendar/moment";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import moment from "moment/moment";
import {
  type PointerEvent as ReactPointerEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import "@/components/calendar/styles-calendar.css";
import { type Booking, schemaToBooking, type Slot } from "../timeline/types.ts";
import { getTimeRangeForWeek, sanitizeBookingTitle } from "../utils.ts";
import { cn } from "@/lib/ui/cn.ts";

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
  return new Date(d.getTime() + 60 * 60 * 1000);
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

const NowIndicator = memo(function NowIndicator({
  date,
}: {
  date: NowIndicatorContentArg["date"];
}) {
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0
  )
    return null; // It's a line, not a label

  // arg.date is already shifted to Moscow wall clock (represented as UTC).
  const text = moment.utc(date).format("HH:mm");

  const isNearTimeLabel =
    date.getUTCMinutes() < 15 || date.getUTCMinutes() > 45;
  if (!isNearTimeLabel) {
    return <div>{text}</div>;
  } else {
    return (
      <div className="bg-base-100 -mt-6 flex h-12 translate-y-2 items-center justify-end">
        {text}
      </div>
    );
  }
});

function renderNowIndicator(arg: NowIndicatorContentArg) {
  return <NowIndicator date={arg.date} />;
}

function calendarTitleFormat(arg: { date: { year: number } }) {
  if (arg.date.year === new Date().getFullYear()) {
    // Show only month if current year
    return moment(arg.date).format("MMMM");
  } else {
    // Show month and year otherwise
    return moment(arg.date).format("MMMM YYYY");
  }
}

function calendarListDayFormat(arg: { date: { year: number } }) {
  if (arg.date.year === new Date().getFullYear()) {
    // Show month, day, weekday
    return moment(arg.date).format("MMMM D, dddd");
  } else {
    // Add year if not current year
    return moment(arg.date).format("YYYY, MMMM D");
  }
}

function handleEventsSet(events: EventApi[]) {
  // Remove duplicates.
  // Accumulate 'extendedProps.calendarURLs' to use it later.
  const unique: Record<string, EventApi> = {};
  for (const event of events) {
    // Using 'id' instead of 'title' is a fix for Music romm
    const uniqueId = (event.id || event.title) + event.startStr + event.endStr;
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
}

function handleEventClassNames(arg: EventContentArg) {
  return cn(
    "cursor-pointer text-sm rounded-md! bg-transparent! border-0! overflow-clip",
    arg.event.extendedProps.isDraft && "cursor-default! rounded-md!",
  );
}

const PLUGINS = [
  momentPlugin,
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
  interactionPlugin,
];
const SLOT_TIME_FORMAT = {
  hour: "2-digit",
  minute: "2-digit",
  meridiem: false,
  hour12: false,
} as const;
const HEADER_TOOLBAR = {
  left: "prev,title,next today",
  center: undefined,
  right: "timeGrid3 timeGridWeek dayGridMonth listMonth",
} as const;
const BUTTON_TEXT = {
  today: "Today",
  listMonth: "List",
  timeGrid3: "3 days",
  timeGridWeek: "Week",
  dayGridMonth: "Month",
} as const;

interface MemoizedCalendarProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  calendarView: string;
  selectable: boolean;
  selectMirror: boolean;
  onSlotSelect: (selectInfo: DateSelectArg) => void;
  onDateClick: (arg: DateClickArg) => void;
  onEventClick: (info: EventClickArg) => void;
  onDatesSet: (arg: DatesSetArg) => void;
  renderTimeGridEvent: (arg: EventContentArg) => React.ReactNode;
  renderDayHeader: (arg: DayHeaderContentArg) => React.ReactNode;
}

const MemoizedCalendar = memo(function MemoizedCalendar({
  calendarRef,
  calendarView,
  selectable,
  selectMirror,
  onSlotSelect,
  onDateClick,
  onEventClick,
  onDatesSet,
  renderTimeGridEvent,
  renderDayHeader,
}: MemoizedCalendarProps) {
  const views = useMemo(
    () => ({
      listMonth: {
        eventContent: renderEventListMonth,
        listDayFormat: calendarListDayFormat,
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
    }),
    [renderTimeGridEvent, renderDayHeader],
  );

  return (
    <FullCalendar
      ref={calendarRef}
      eventsSet={handleEventsSet}
      progressiveEventRendering={true}
      timeZone="Europe/Moscow"
      plugins={PLUGINS}
      initialView={calendarView}
      slotDuration="00:30:00"
      eventTimeFormat={SLOT_TIME_FORMAT}
      slotLabelFormat={SLOT_TIME_FORMAT}
      headerToolbar={HEADER_TOOLBAR}
      height="auto"
      contentHeight="auto"
      buttonText={BUTTON_TEXT}
      titleFormat={calendarTitleFormat}
      views={views}
      allDayText=""
      nowIndicator={true}
      nowIndicatorContent={renderNowIndicator}
      firstDay={1}
      navLinks={false}
      eventInteractive={true}
      expandRows={true}
      eventClassNames={handleEventClassNames}
      dateClick={onDateClick}
      eventClick={onEventClick}
      scrollTime="07:30:00"
      scrollTimeReset={false}
      noEventsContent={renderNoEventsContent}
      datesSet={onDatesSet}
      selectable={selectable}
      selectMirror={selectMirror}
      selectOverlap={false}
      select={onSlotSelect}
      longPressDelay={500}
      selectLongPressDelay={500}
      unselectAuto={false}
      unselectCancel=".fc-event"
    />
  );
});

export default function RoomCalendarViewer({ roomId }: { roomId: string }) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>(undefined);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<
    Booking | undefined
  >(undefined);
  const [pastBookingPopupVisible, setPastBookingPopupVisible] = useState(false);

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
  const bookingDraftRef = useRef<BookingDraft | null>(null);
  const pastBookingPopupTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [draftPhase, setDraftPhase] = useState<BookingDraft["phase"] | null>(
    null,
  );
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

  const hidePastBookingPopup = useCallback(() => {
    setPastBookingPopupVisible(false);
    if (pastBookingPopupTimeoutRef.current) {
      clearTimeout(pastBookingPopupTimeoutRef.current);
      pastBookingPopupTimeoutRef.current = null;
    }
  }, []);

  const showPastBookingPopup = useCallback(() => {
    setPastBookingPopupVisible(true);
    if (pastBookingPopupTimeoutRef.current) {
      clearTimeout(pastBookingPopupTimeoutRef.current);
    }
    pastBookingPopupTimeoutRef.current = setTimeout(() => {
      setPastBookingPopupVisible(false);
      pastBookingPopupTimeoutRef.current = null;
    }, 3000);
  }, []);

  const syncDraftToCalendar = useCallback(() => {
    const draft = bookingDraftRef.current;
    if (!draft || !room) return;

    const api = calendarRef.current?.getApi();
    if (!api) return;

    const durationLabel = formatDuration(draft.start, draft.end);
    const draftEvent = api.getEventById(DRAFT_SLOT_EVENT_ID);
    if (draftEvent) {
      draftEvent.setDates(draft.start, draft.end);
      draftEvent.setExtendedProp("durationLabel", durationLabel);
      return;
    }

    api.addEvent({
      id: DRAFT_SLOT_EVENT_ID,
      title: "New booking",
      start: draft.start,
      end: draft.end,
      display: "block",
      extendedProps: {
        isDraft: true,
        durationLabel,
      },
      color: "#9A2EFF",
    });
  }, [room]);

  const clearBookingDraft = useCallback(() => {
    bookingDraftRef.current = null;
    setDraftPhase(null);
    dragStateRef.current = null;
    const api = calendarRef.current?.getApi();
    api?.getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
  }, []);

  const handleSlotSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      if (!room) return;

      const start = fromCalendarDate(selectInfo.start);
      const end = fromCalendarDate(selectInfo.end);
      if (start.getTime() < Date.now()) {
        calendarRef.current?.getApi().unselect();
        showPastBookingPopup();
        return;
      }

      hidePastBookingPopup();
      const slot: Slot = {
        room: {
          idx: 0,
          id: room.id,
          title: room.title,
          short_name: room.short_name,
          restrict_daytime: room.restrict_daytime,
        },
        // selectInfo already provides shifted dates, normalize them for the modal
        start,
        end,
      };

      setSelectedSlot(slot);
      setSelectedBookingDetails(undefined);
      setBookingModalOpen(true);
    },
    [room, hidePastBookingPopup, showPastBookingPopup],
  );

  const handleModalClose = useCallback((open: boolean) => {
    setBookingModalOpen(open);
    if (!open) {
      setSelectedSlot(undefined);
      setSelectedBookingDetails(undefined);
      bookingDraftRef.current = null;
      setDraftPhase(null);
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

      if (clickedMs < nowFloorMs) {
        showPastBookingPopup();
        return;
      }

      // For overlap check, use real UTC. Check for 1 hour overlap since initial tile is 1 hour.
      const clickedUtcMs = clickedMs - 3 * 3600 * 1000;
      if (
        hasBookingsOverlap(
          clickedUtcMs,
          clickedUtcMs + 60 * 60 * 1000,
          bookings,
        )
      ) {
        return;
      }

      hidePastBookingPopup();
      const clicked = new Date(clickedMs);

      bookingDraftRef.current = {
        phase: "preview",
        start: clicked,
        end: addDraftSlotMs(clicked),
      };
      setDraftPhase("preview");
      syncDraftToCalendar();
    },
    [
      narrowForTapBooking,
      room,
      bookingModalOpen,
      bookings,
      hidePastBookingPopup,
      showPastBookingPopup,
      syncDraftToCalendar,
    ],
  );

  const handleDraftDragStart = useCallback(
    (anchor: DraftDragAnchor, pointerId: number, clientY: number) => {
      const draft = bookingDraftRef.current;
      if (!draft) return;
      const slotEl = document.querySelector(
        ".fc-timegrid-slot",
      ) as HTMLElement | null;
      const slotHeightPx = slotEl?.getBoundingClientRect().height || 20;

      dragStateRef.current = {
        anchor,
        pointerId,
        startY: clientY,
        initialStartMs: draft.start.getTime(),
        initialEndMs: draft.end.getTime(),
        slotHeightPx: Math.max(1, slotHeightPx),
      };
      bookingDraftRef.current = {
        ...draft,
        phase: "dragging",
      };
      setDraftPhase("dragging");
      syncDraftToCalendar();
    },
    [syncDraftToCalendar],
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

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault();
      info.jsEvent.stopPropagation();
      if (info.event.extendedProps.isDraft) return;
      const booking = info.event.extendedProps.booking;
      if (!booking) return;
      clearBookingDraft();
      setSelectedSlot(undefined);
      setSelectedBookingDetails(schemaToBooking(booking));
      setBookingModalOpen(true);
    },
    [clearBookingDraft],
  );

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setCalendarView(arg.view.type);
    if (arg.start && arg.end) {
      setDateRange({ startDate: arg.start, endDate: arg.end });
    }
  }, []);

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
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-primary) 20%, var(--color-base-100))",
              borderColor: "var(--color-primary)",
            }}
          >
            {/* Top and bottom bars aligned with edges */}
            <div
              className="absolute top-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-b-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
            <div
              className="absolute bottom-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-t-full"
              style={{ backgroundColor: "var(--color-primary)" }}
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
              <span className="text-base-content pointer-events-none px-2 text-xs font-semibold">
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

      const draft = bookingDraftRef.current;
      if (!draft) return;

      let nextStart: number;
      let nextEnd: number;

      if (dragState.anchor === "top") {
        const tentativeStart = roundToNearestStepMs(
          dragState.initialStartMs + diffMs,
          DRAFT_SLOT_STEP_MS,
        );

        if (tentativeStart < dragState.initialEndMs) {
          // Normal behavior: move start edge (shrinking or expanding UP)
          nextStart = tentativeStart;
          nextEnd = dragState.initialEndMs;

          // Enforce 30m minimum duration if not flipped
          if (nextStart > dragState.initialEndMs - DRAFT_SLOT_STEP_MS) {
            nextStart = dragState.initialEndMs - DRAFT_SLOT_STEP_MS;
          }

          // Limits: allow dragging right to current time
          const minStartLimit = Math.max(nowMs, nextEnd - DRAFT_SLOT_MAX_MS);
          nextStart = Math.max(nextStart, minStartLimit);

          // Overlaps: since we only move start, we only need to check what's above us
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf() + 3 * 3600 * 1000;
              const bEnd = moment(b.end).valueOf() + 3 * 3600 * 1000;
              if (nextStart < bEnd && nextEnd > bStart) {
                nextStart = Math.max(nextStart, bEnd);
              }
            }
          }
          if (nextStart > nextEnd - DRAFT_SLOT_STEP_MS) {
            nextStart = nextEnd - DRAFT_SLOT_STEP_MS;
          }
        } else {
          // Flip behavior: move bottom edge DOWN (starting from initialEndMs)
          nextStart = dragState.initialEndMs;
          nextEnd = Math.max(
            tentativeStart,
            dragState.initialEndMs + DRAFT_SLOT_STEP_MS,
          );

          // Limits
          const maxEndLimit = nextStart + DRAFT_SLOT_MAX_MS;
          nextEnd = Math.min(nextEnd, maxEndLimit);

          // Overlaps: since we are pushing end down, check what's below us
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf() + 3 * 3600 * 1000;
              const bEnd = moment(b.end).valueOf() + 3 * 3600 * 1000;
              if (nextStart < bEnd && nextEnd > bStart) {
                nextEnd = Math.min(nextEnd, bStart);
              }
            }
          }
          if (nextEnd < nextStart + DRAFT_SLOT_STEP_MS) {
            nextEnd = nextStart + DRAFT_SLOT_STEP_MS;
          }
        }
      } else {
        // anchor === "bottom"
        const tentativeEnd = roundToNearestStepMs(
          dragState.initialEndMs + diffMs,
          DRAFT_SLOT_STEP_MS,
        );

        if (tentativeEnd > dragState.initialStartMs) {
          // Normal behavior: move end edge (shrinking or expanding DOWN)
          nextStart = dragState.initialStartMs;
          nextEnd = tentativeEnd;

          // Enforce 30m minimum duration
          if (nextEnd < dragState.initialStartMs + DRAFT_SLOT_STEP_MS) {
            nextEnd = dragState.initialStartMs + DRAFT_SLOT_STEP_MS;
          }

          // Limits
          const maxEndLimit = nextStart + DRAFT_SLOT_MAX_MS;
          nextEnd = Math.min(nextEnd, maxEndLimit);

          // Overlaps
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf() + 3 * 3600 * 1000;
              const bEnd = moment(b.end).valueOf() + 3 * 3600 * 1000;
              if (nextStart < bEnd && nextEnd > bStart) {
                nextEnd = Math.min(nextEnd, bStart);
              }
            }
          }
          if (nextEnd < nextStart + DRAFT_SLOT_STEP_MS) {
            nextEnd = nextStart + DRAFT_SLOT_STEP_MS;
          }
        } else {
          // Flip behavior: move top edge UP (ending at initialStartMs)
          nextEnd = dragState.initialStartMs;
          nextStart = Math.min(
            tentativeEnd,
            dragState.initialStartMs - DRAFT_SLOT_STEP_MS,
          );

          // Limits: allow dragging top edge up right to current time
          const minStartLimit = Math.max(nowMs, nextEnd - DRAFT_SLOT_MAX_MS);
          nextStart = Math.max(nextStart, minStartLimit);

          // Overlaps
          if (bookings) {
            for (const b of bookings) {
              const bStart = moment(b.start).valueOf() + 3 * 3600 * 1000;
              const bEnd = moment(b.end).valueOf() + 3 * 3600 * 1000;
              if (nextStart < bEnd && nextEnd > bStart) {
                nextStart = Math.max(nextStart, bEnd);
              }
            }
          }
          if (nextStart > nextEnd - DRAFT_SLOT_STEP_MS) {
            nextStart = nextEnd - DRAFT_SLOT_STEP_MS;
          }
        }
      }

      bookingDraftRef.current = {
        phase: "dragging",
        start: new Date(nextStart),
        end: new Date(nextEnd),
      };
      if (fromCalendarDate(new Date(nextStart)).getTime() >= Date.now()) {
        hidePastBookingPopup();
      }
      syncDraftToCalendar();
    }

    function handlePointerRelease(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      if (event.pointerId !== dragState.pointerId) return;
      dragStateRef.current = null;
      if (bookingDraftRef.current) {
        bookingDraftRef.current = {
          ...bookingDraftRef.current,
          phase: "preview",
        };
        setDraftPhase("preview");
        syncDraftToCalendar();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerRelease);
    window.addEventListener("pointercancel", handlePointerRelease);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerRelease);
      window.removeEventListener("pointercancel", handlePointerRelease);
    };
  }, [bookings, hidePastBookingPopup, syncDraftToCalendar]);

  const handleDraftBook = useCallback(() => {
    const draft = bookingDraftRef.current;
    if (!room || !draft) return;

    // Normalize to real UTC before sending to modal
    const start = fromCalendarDate(draft.start);
    const end = fromCalendarDate(draft.end);

    if (start.getTime() < Date.now()) {
      showPastBookingPopup();
      return;
    }

    hidePastBookingPopup();
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
    bookingDraftRef.current = null;
    setDraftPhase(null);
    calendarRef.current?.getApi().getEventById(DRAFT_SLOT_EVENT_ID)?.remove();
  }, [room, hidePastBookingPopup, showPastBookingPopup]);

  useEffect(() => {
    return () => {
      if (pastBookingPopupTimeoutRef.current) {
        clearTimeout(pastBookingPopupTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const draft = bookingDraftRef.current;
    if (!draft) return;

    if (!calendarView.startsWith("timeGrid")) {
      clearBookingDraft();
      return;
    }

    const vs = dateRange.startDate.getTime();
    const ve = dateRange.endDate.getTime();
    if (draft.start.getTime() >= ve || draft.end.getTime() <= vs) {
      clearBookingDraft();
    }
  }, [calendarView, dateRange, clearBookingDraft]);

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
      className={cn(
        "relative overflow-clip",
        isPending && "calendar-loading",
        draftPhase && "pb-28",
      )}
    >
      <MemoizedCalendar
        calendarRef={calendarRef}
        calendarView={calendarView}
        selectable={!tapTwoStepTimeGrid}
        selectMirror={!tapTwoStepTimeGrid}
        onSlotSelect={handleSlotSelect}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onDatesSet={handleDatesSet}
        renderTimeGridEvent={renderTimeGridEvent}
        renderDayHeader={renderDayHeader}
      />
      {pastBookingPopupVisible && !draftPhase && (
        <div className="pointer-events-none fixed right-3 bottom-14 left-3 z-30 flex justify-center @md/content:justify-end">
          <div className="rounded-xs border border-red-600 bg-red-400 px-3 py-1 text-sm font-medium text-red-900 shadow-sm dark:border-red-700 dark:bg-red-900 dark:text-red-500">
            You cannot book in the past.
          </div>
        </div>
      )}
      {draftPhase && (
        <div className="bg-base-200/95 border-base-300 fixed right-0 bottom-0 left-0 z-20 border-t px-0 pt-3 shadow-lg backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {pastBookingPopupVisible && (
            <div className="pointer-events-none absolute right-3 bottom-full left-3 z-30 mb-2 flex justify-center @md/content:justify-end">
              <div className="rounded-xs border border-red-600 bg-red-400 px-3 py-1 text-sm font-medium text-red-900 shadow-sm dark:border-red-700 dark:bg-red-900 dark:text-red-500">
                You cannot book in the past.
              </div>
            </div>
          )}
          {draftPhase === "preview" && (
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
              className="btn btn-outline btn-sm min-w-24"
              onClick={clearBookingDraft}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-w-24"
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

function renderNoEventsContent() {
  return "No events this month";
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
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-primary) 20%, var(--color-base-100))",
          borderColor: "var(--color-primary)",
        }}
      >
        {/* Top and bottom bars aligned with edges */}
        <div
          className="absolute top-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-b-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-1.5 w-1/2 -translate-x-1/2 rounded-t-full"
          style={{ backgroundColor: "var(--color-primary)" }}
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
          <span className="text-base-content pointer-events-none px-2 text-xs font-semibold">
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
      <div className="inline-flex w-fit items-center justify-center rounded-md in-[.fc-day-today]:bg-red-500 in-[.fc-day-today]:px-1 in-[.fc-day-today]:text-white">
        {moment(date).format("D")}
      </div>
    </>
  );
}
