import { T, msBetween } from "@/lib/utils/dates";
import { cn } from "@/lib/ui/cn";
import { useElementSize } from "@/lib/ui/use-element-size";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { useNow } from "@/lib/ui/use-now";
import { useScroll } from "@/lib/ui/use-scroll";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookingButtons } from "./BookingButtons";
import { BookingBar } from "./BookingBar";
import {
  getListenersForState,
  interactionStatesEqual,
  validSlotByState,
  type InteractionState,
  type MachineContext,
} from "./interaction-machine";
import { NewBookingPreview, NEW_BOOKING_BOX_ID } from "./NewBookingPreview";
import { NowIndicator } from "./NowIndicator";
import { RoomList } from "./RoomList";
import { TimeGridSvg } from "./TimeGridSvg";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineOverlay } from "./TimelineOverlay";
import type { roomBookingTypes } from "@/api/room-booking";
import type { Booking, Room, ScrollToOptions, Slot } from "./types";
import {
  buildBookingsByRoomPrefixMaxEnd,
  buildBookingsByRoomSorted,
  computeBookingPositions,
  computeTimelineDates,
  computeVisibleDates,
  msToPx,
  pxToMs,
  rangeIntersectingBookings,
  type BookingPosition,
} from "./utils";

/* ========================================================================== */
/* =============================== Constants ================================ */
/* ========================================================================== */

const COMPACT_VERSION_WIDTH_THRESHOLD = 768;

const SIDEBAR_WIDTH_DEFAULT = 200;
const SIDEBAR_WIDTH_COMPACT = 65;

const PIXELS_PER_MINUTE_DEFAULT = 100 / 30;
const PIXELS_PER_MINUTE_COMPACT = 85 / 30;

const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 50;

const HORIZONTAL_OVERSCAN_PX = 500;

const PLACEHOLDER_ROOMS_DEFAULT_COUNT = 18;

/* ========================================================================== */
/* ========================== Component Types =============================== */
/* ========================================================================== */

export interface BookingTimelineProps {
  className?: string;
  startDate: Date;
  endDate: Date;
  rooms: roomBookingTypes.SchemaRoom[] | undefined;
  isRoomsPending: boolean;
  bookings: Booking[] | undefined;
  isBookingsPending: boolean;
  onBook: (slot: Slot) => void;
  onBookingClick: (booking: Booking) => void;
}

export interface BookingTimelineHandle {
  scrollTo: (options: ScrollToOptions) => void;
}

/* ========================================================================== */
/* ============================= Component ================================== */
/* ========================================================================== */

export const BookingTimeline = forwardRef<
  BookingTimelineHandle,
  BookingTimelineProps
>(function BookingTimeline(
  {
    className,
    startDate,
    endDate,
    rooms: rawRooms,
    isRoomsPending,
    bookings: rawBookings,
    isBookingsPending,
    onBook,
    onBookingClick,
  },
  ref,
) {
  /* ============================= Hooks Setup ============================== */

  const compactMode = useMediaQuery(
    `(max-width: ${COMPACT_VERSION_WIDTH_THRESHOLD}px)`,
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const { x: scrollX, y: scrollY } = useScroll(scrollerRef);
  const { width: containerWidth, height: containerHeight } =
    useElementSize(scrollerRef);
  const now = useNow(T.Sec);

  /* ============================= Derived Values ============================ */

  const sidebarWidth = compactMode
    ? SIDEBAR_WIDTH_COMPACT
    : SIDEBAR_WIDTH_DEFAULT;

  const pixelsPerMinute = compactMode
    ? PIXELS_PER_MINUTE_COMPACT
    : PIXELS_PER_MINUTE_DEFAULT;

  const timelineStart = startDate;
  const timelineEnd = endDate;

  const timelineDates = useMemo(
    () => computeTimelineDates(timelineStart, timelineEnd),
    [timelineStart, timelineEnd],
  );

  const totalTimelineWidth = useMemo(() => {
    const durationMs = msBetween(timelineStart, timelineEnd);
    return msToPx(durationMs, pixelsPerMinute);
  }, [timelineStart, timelineEnd, pixelsPerMinute]);

  const actualRooms: Room[] = useMemo(
    () => rawRooms?.map((room, idx) => ({ ...room, idx }) as Room) ?? [],
    [rawRooms],
  );

  const bookingsByRoomSorted = useMemo(
    () => buildBookingsByRoomSorted(rawBookings),
    [rawBookings],
  );

  const bookingsByRoomPrefixMaxEnd = useMemo(
    () => buildBookingsByRoomPrefixMaxEnd(bookingsByRoomSorted),
    [bookingsByRoomSorted],
  );

  const bookingPositions: Map<string, BookingPosition> = useMemo(
    () =>
      computeBookingPositions(
        timelineStart,
        pixelsPerMinute,
        bookingsByRoomSorted,
      ),
    [timelineStart, pixelsPerMinute, bookingsByRoomSorted],
  );

  // Visible range calculations
  const visibleRangePx = useMemo(() => {
    const left = Math.max(0, scrollX - HORIZONTAL_OVERSCAN_PX);
    const right = Math.min(
      totalTimelineWidth,
      scrollX + containerWidth + HORIZONTAL_OVERSCAN_PX,
    );
    return { left, right, width: right - left };
  }, [scrollX, containerWidth, totalTimelineWidth]);

  const visibleTimeRange = useMemo(() => {
    const startMs =
      timelineStart.getTime() + pxToMs(visibleRangePx.left, pixelsPerMinute);
    const endMs =
      timelineStart.getTime() + pxToMs(visibleRangePx.right, pixelsPerMinute);
    return { startMs, endMs };
  }, [timelineStart, visibleRangePx, pixelsPerMinute]);

  const visibleDates = useMemo(
    () =>
      computeVisibleDates(
        timelineDates,
        visibleTimeRange.startMs,
        visibleTimeRange.endMs,
      ),
    [timelineDates, visibleTimeRange],
  );

  const totalBodyHeight = useMemo(() => {
    const roomCount = isRoomsPending
      ? PLACEHOLDER_ROOMS_DEFAULT_COUNT
      : actualRooms.length;
    return roomCount * ROW_HEIGHT;
  }, [isRoomsPending, actualRooms.length]);

  /* ========================= Interaction State Machine ===================== */

  const [interactionState, setInteractionState] = useState<InteractionState>({
    type: "idle",
  });

  const lastTouchTimeStampRef = useRef(-100000000);

  // Keep a ref to the latest interactionState so event handlers don't go stale
  const interactionStateRef = useRef(interactionState);
  interactionStateRef.current = interactionState;

  // Build the machine context
  const machineContext: MachineContext = useMemo(
    () => ({
      overlayEl: overlayRef.current,
      scrollerEl: scrollerRef.current,
      sidebarWidth,
      headerHeight: HEADER_HEIGHT,
      rowHeight: ROW_HEIGHT,
      scrollX,
      scrollY,
      timelineStart,
      pixelsPerMinute,
      rooms: actualRooms,
      now,
      bookingsByRoomSorted,
      bookingsByRoomPrefixMaxEnd,
      lastTouchTimeStampRef,
      newBookingBoxId: NEW_BOOKING_BOX_ID,
    }),
    [
      sidebarWidth,
      scrollX,
      scrollY,
      timelineStart,
      pixelsPerMinute,
      actualRooms,
      now,
      bookingsByRoomSorted,
      bookingsByRoomPrefixMaxEnd,
    ],
  );

  // Register/unregister event listeners based on current state type and context
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const currentInteractionState = interactionStateRef.current;
    const listeners = getListenersForState(currentInteractionState.type);
    const cleanupFns: (() => void)[] = [];

    for (const { eventType, handler } of listeners) {
      const wrappedHandler = (event: Event) => {
        const result = handler(
          event,
          interactionStateRef.current,
          machineContext,
        );

        if (result !== null) {
          // Skip state update if nothing meaningful changed (prevents
          // hundreds of re-renders during drag when pixel hasn't crossed
          // a grid boundary or changed rooms).
          if (interactionStatesEqual(interactionStateRef.current, result))
            return;

          const emitResult = result as InteractionState & {
            _emitSlot?: Slot;
          };
          if (emitResult._emitSlot) {
            onBook(emitResult._emitSlot);
            const { ...cleanResult } = emitResult as Record<string, unknown>;
            delete cleanResult._emitSlot;
            setInteractionState(cleanResult as unknown as InteractionState);
          } else {
            setInteractionState(result);
          }
        }
      };

      el.addEventListener(eventType, wrappedHandler);
      cleanupFns.push(() => el.removeEventListener(eventType, wrappedHandler));
    }

    return () => {
      for (const cleanup of cleanupFns) {
        try {
          cleanup();
        } catch (err) {
          console.error("Failed to cleanup event listener:", err);
        }
      }
    };
  }, [interactionState.type, machineContext, onBook]);

  /* ========================= Derived Interaction Values ==================== */

  const newBookingTouched = useMemo(() => {
    switch (interactionState.type) {
      case "idle":
      case "mouse-hovering":
      case "mouse-dragging":
        return false;
      case "touch-inactive":
      case "touch-dragging-edge":
        return true;
      default:
        return interactionState satisfies never;
    }
  }, [interactionState]);

  const newBookingSlot = useMemo<Slot | null>(() => {
    return validSlotByState(interactionState, machineContext);
  }, [interactionState, machineContext]);

  const isDragging = interactionState.type === "mouse-dragging";

  /* ========================= Callbacks =================================== */

  const handleBookingCancel = useCallback(() => {
    setInteractionState({ type: "idle" });
  }, []);

  const handleBookingConfirm = useCallback(() => {
    switch (interactionState.type) {
      case "touch-inactive":
      case "touch-dragging-edge":
        onBook(interactionState.slot);
        setInteractionState({ type: "idle" });
        break;
    }
  }, [interactionState, onBook]);

  const scrollTo = useCallback(
    (options: ScrollToOptions) => {
      const el = scrollerRef.current;
      if (!el) return;

      const {
        to,
        behavior = "smooth",
        position = "center",
        offsetMs = 0,
      } = options;

      const { width } = el.getBoundingClientRect();
      const toLeftPx = msToPx(msBetween(timelineStart, to), pixelsPerMinute);

      let scrollLeftPx: number;
      switch (position) {
        case "left":
          scrollLeftPx = toLeftPx;
          break;
        case "center":
          scrollLeftPx = toLeftPx - (width - sidebarWidth) / 2;
          break;
        case "right":
          scrollLeftPx = toLeftPx - (width - sidebarWidth) + 1;
          break;
      }

      el.scrollTo({
        behavior,
        left: scrollLeftPx + msToPx(offsetMs, pixelsPerMinute),
      });
    },
    [timelineStart, pixelsPerMinute, sidebarWidth],
  );

  const scrollToNow = useCallback(() => {
    scrollTo({
      to: now,
      behavior: "smooth",
      position: "center",
    });
  }, [scrollTo, now]);

  // On mount, scroll to now
  useEffect(() => {
    scrollTo({
      to: now,
      behavior: "instant",
      position: "left",
      offsetMs: -30 * T.Min,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========================= Expose Methods =============================== */

  useImperativeHandle(
    ref,
    () => ({
      scrollTo,
    }),
    [scrollTo],
  );

  /* ========================= Render ====================================== */

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Main timeline container */}
      <div
        className="relative overflow-hidden"
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
            "--header-height": `${HEADER_HEIGHT}px`,
            "--row-height": `${ROW_HEIGHT}px`,
            "--ppm": pixelsPerMinute,
            "--total-width": `${totalTimelineWidth + sidebarWidth}px`,
            "--body-height": `${totalBodyHeight}px`,
            "--container-height": `${containerHeight}px`,
            "--visible-left": `${visibleRangePx.left}px`,
            "--visible-width": `${visibleRangePx.width}px`,
          } as React.CSSProperties
        }
      >
        {/* Corner label */}
        <div
          className="bg-base-100 text-base-content border-base-300 text-md absolute top-0 flex items-center border-r border-b pl-3"
          style={{
            zIndex: 5,
            width: sidebarWidth,
            height: HEADER_HEIGHT,
          }}
        >
          {!compactMode && <h2>Timeline</h2>}
        </div>

        {/* Scrollable area */}
        <div
          ref={scrollerRef}
          className="relative max-h-full overflow-auto overscroll-none"
        >
          {/* Pseudo-spacer for full scroll width */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-px"
            style={{ width: totalTimelineWidth + sidebarWidth }}
          />

          <div
            className="sticky left-0 w-full"
            style={{ minHeight: HEADER_HEIGHT + totalBodyHeight }}
          >
            {/* Time grid */}
            <TimeGridSvg
              scrollX={scrollX}
              pixelsPerMinute={pixelsPerMinute}
              sidebarWidth={sidebarWidth}
              headerHeight={HEADER_HEIGHT}
              bodyHeight={totalBodyHeight}
            />

            {/* Now indicator */}
            <NowIndicator
              now={now}
              timelineStart={timelineStart}
              scrollX={scrollX}
              pixelsPerMinute={pixelsPerMinute}
              sidebarWidth={sidebarWidth}
              headerHeight={HEADER_HEIGHT}
              bodyHeight={totalBodyHeight}
              onScrollToNow={scrollToNow}
            />

            {/* New booking preview */}
            <NewBookingPreview
              slot={newBookingSlot}
              scrollX={scrollX}
              timelineStart={timelineStart}
              pixelsPerMinute={pixelsPerMinute}
              sidebarWidth={sidebarWidth}
              headerHeight={HEADER_HEIGHT}
              rowHeight={ROW_HEIGHT}
              bodyHeight={totalBodyHeight}
              isDragging={isDragging}
              isTouched={newBookingTouched}
            />

            {/* Timeline header */}
            <TimelineHeader
              visibleDates={visibleDates}
              timelineStart={timelineStart}
              scrollX={scrollX}
              pixelsPerMinute={pixelsPerMinute}
              sidebarWidth={sidebarWidth}
              headerHeight={HEADER_HEIGHT}
            />

            {/* Body with bookings */}
            <div className="relative" style={{ height: totalBodyHeight }}>
              {!isRoomsPending && !isBookingsPending ? (
                <div className="pointer-events-none absolute top-0 left-0 h-0 w-0 overflow-visible">
                  {actualRooms.map((room) => {
                    const visibleBookings = rangeIntersectingBookings(
                      visibleTimeRange.startMs,
                      visibleTimeRange.endMs,
                      room.id,
                      bookingsByRoomSorted,
                      bookingsByRoomPrefixMaxEnd,
                    );

                    return visibleBookings.map((booking) => {
                      const position = bookingPositions.get(booking.id);
                      if (!position) return null;

                      return (
                        <div key={booking.id} className="pointer-events-auto">
                          <BookingBar
                            booking={booking}
                            position={position}
                            rowIndex={room.idx}
                            scrollX={scrollX}
                            sidebarWidth={sidebarWidth}
                            rowHeight={ROW_HEIGHT}
                            onBookingClick={onBookingClick}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              ) : isBookingsPending ? (
                <div className="absolute top-0 left-0 h-0 w-0 overflow-visible">
                  {Array.from({
                    length: isRoomsPending
                      ? PLACEHOLDER_ROOMS_DEFAULT_COUNT
                      : actualRooms.length,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute px-0.5 py-1.5 whitespace-nowrap opacity-50 select-none"
                      style={{
                        left: 0,
                        top: i * ROW_HEIGHT,
                        width: visibleRangePx.width,
                        height: ROW_HEIGHT,
                      }}
                    >
                      <div className="flex h-full w-full items-center rounded-sm px-2">
                        <span className="skeleton h-4 w-full rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Room list sidebar */}
        <RoomList
          rooms={actualRooms}
          roomsLoading={isRoomsPending}
          scrollY={scrollY}
          compactMode={compactMode}
          containerHeight={containerHeight}
          sidebarWidth={sidebarWidth}
          headerHeight={HEADER_HEIGHT}
          rowHeight={ROW_HEIGHT}
        />

        {/* Interactive overlay */}
        <TimelineOverlay
          overlayRef={overlayRef}
          sidebarWidth={sidebarWidth}
          headerHeight={HEADER_HEIGHT}
        />
      </div>

      {/* Touch booking buttons */}
      <BookingButtons
        visible={newBookingTouched}
        onCancel={handleBookingCancel}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
});

export default BookingTimeline;
