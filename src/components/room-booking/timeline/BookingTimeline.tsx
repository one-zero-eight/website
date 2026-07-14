import type { roomBookingTypes } from "@/api/room-booking";
import { accessLevelColors } from "@/components/room-booking/AccessLevelIcon.tsx";
import { sanitizeBookingTitle } from "@/components/room-booking/utils.ts";
import { cn } from "@/lib/ui/cn";
import {
  clockTime,
  msBetween as msBetweenDates,
  T,
} from "@/lib/utils/dates.ts";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import styles from "./BookingTimeline.module.css";
import {
  accessLevelTooltip,
  buildNewBookingData,
  COMPACT_VERSION_WIDTH_THRESHOLD,
  createStateListenerTransitionMap,
  dayTitle,
  HEADER_HEIGHT,
  HORIZONTAL_OVERSCAN_PX,
  HOURS_TIMES,
  msBetween,
  msToPx,
  NEW_BOOKING_BOX_ID,
  PIXELS_PER_MINUTE_COMPACT,
  PIXELS_PER_MINUTE_DEFAULT,
  PLACEHOLDER_ROOMS,
  PLACEHOLDER_ROOMS_DEFAULT_COUNT,
  px,
  rangeIntersectingBookings,
  ROW_HEIGHT,
  SIDEBAR_WIDTH_COMPACT,
  SIDEBAR_WIDTH_DEFAULT,
  slotsEqual,
  validSlotByState,
  type InteractionState,
  type TimelineInteractionContext,
} from "./bookingTimelineInteraction.ts";
import type { Booking, Room, ScrollToOptions, Slot } from "./types.ts";

export type BookingTimelineProps = {
  startDate: Date;
  endDate: Date;
  rooms: roomBookingTypes.SchemaRoom[] | undefined;
  isRoomsPending: boolean;
  bookings: Booking[] | undefined;
  isBookingsPending: boolean;
  className?: string;
  onBook: (slot: Slot) => void;
  onBookingClick: (booking: Booking) => void;
};

export type BookingTimelineRef = {
  scrollTo: (options: ScrollToOptions) => void;
};

export const BookingTimeline = forwardRef<
  BookingTimelineRef,
  BookingTimelineProps
>(function BookingTimeline(
  {
    startDate,
    endDate,
    rooms,
    isRoomsPending,
    bookings,
    isBookingsPending,
    className,
    onBook,
    onBookingClick,
  },
  ref,
) {
  const compactModeEnabled = useMediaQuery(
    `(max-width: ${COMPACT_VERSION_WIDTH_THRESHOLD}px)`,
  );
  const sidebarWidth = compactModeEnabled
    ? SIDEBAR_WIDTH_COMPACT
    : SIDEBAR_WIDTH_DEFAULT;
  const pixelsPerMinute = compactModeEnabled
    ? PIXELS_PER_MINUTE_COMPACT
    : PIXELS_PER_MINUTE_DEFAULT;

  const timelineStart = startDate;
  const timelineEnd = endDate;

  const nowMs = useNowMS(true, T.Sec);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const wrapperEl = useRef<HTMLDivElement>(null);
  const scrollerEl = useRef<HTMLDivElement>(null);
  const overlayEl = useRef<HTMLDivElement>(null);

  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const [interactionState, setInteractionState] = useState<InteractionState>({
    type: "idle",
  });

  const onBookRef = useRef(onBook);
  onBookRef.current = onBook;

  const actualRooms = useMemo(
    () => rooms?.map((room, idx) => ({ ...room, idx })) ?? [],
    [rooms],
  );
  const roomsLoading = isRoomsPending;

  const actualBookings = useMemo(() => {
    const map = new Map<Booking["id"], Booking>();
    for (const booking of bookings ?? []) {
      map.set(booking.id, booking);
    }
    return map;
  }, [bookings]);
  const bookingsLoading = isBookingsPending;

  const actualBookingsByRoomSorted = useMemo(() => {
    const map = new Map<Room["id"], Booking[]>();

    for (const booking of actualBookings.values()) {
      const roomBookings = map.get(booking.room_id);
      if (roomBookings) roomBookings.push(booking);
      else map.set(booking.room_id, [booking]);
    }

    map.forEach((roomBookings) =>
      roomBookings.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    );

    return map;
  }, [actualBookings]);

  const actualBookingsByRoomPrefixMaxEnd = useMemo(() => {
    const map = new Map<Room["id"], number[]>();

    for (const [roomId, roomBookings] of actualBookingsByRoomSorted.entries()) {
      const prefixMaxEnd: number[] = [];
      let maxEnd = Number.NEGATIVE_INFINITY;

      for (const booking of roomBookings) {
        const endMs = booking.endsAt.getTime();
        if (endMs > maxEnd) maxEnd = endMs;
        prefixMaxEnd.push(maxEnd);
      }

      map.set(roomId, prefixMaxEnd);
    }

    return map;
  }, [actualBookingsByRoomSorted]);

  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    let date = new Date(timelineStart.getTime());
    const end = timelineEnd;
    while (date < end) {
      dates.push(date);
      date = new Date(date.getTime() + T.Day);
    }
    return dates;
  }, [timelineStart, timelineEnd]);

  const totalTimelineWidth = useMemo(() => {
    const durationMs = msBetweenDates(timelineStart, timelineEnd);
    return msToPx(durationMs, pixelsPerMinute);
  }, [timelineStart, timelineEnd, pixelsPerMinute]);

  const visibleRangePx = useMemo(() => {
    const left = Math.max(0, scrollX - HORIZONTAL_OVERSCAN_PX);
    const right = Math.min(
      totalTimelineWidth,
      scrollX + containerWidth + HORIZONTAL_OVERSCAN_PX,
    );
    return { left, right, width: right - left };
  }, [scrollX, containerWidth, totalTimelineWidth]);

  const visibleTimeRange = useMemo(() => {
    const { left: viewportLeft, right: viewportRight } = visibleRangePx;

    const startMs =
      timelineStart.getTime() + (viewportLeft / pixelsPerMinute) * T.Min;
    const endMs =
      timelineStart.getTime() + (viewportRight / pixelsPerMinute) * T.Min;

    return { startMs, endMs };
  }, [visibleRangePx, timelineStart, pixelsPerMinute]);

  const visibleDates = useMemo(() => {
    const { startMs, endMs } = visibleTimeRange;
    const dates: Date[] = [];

    for (const date of timelineDates) {
      const dayStart = date.getTime();
      const dayEnd = dayStart + T.Day;

      if (dayEnd > startMs && dayStart < endMs) {
        dates.push(date);
      }
    }

    return dates;
  }, [timelineDates, visibleTimeRange]);

  const totalBodyHeight = useMemo(() => {
    const roomCount = roomsLoading
      ? PLACEHOLDER_ROOMS_DEFAULT_COUNT
      : actualRooms.length;
    return roomCount * ROW_HEIGHT;
  }, [roomsLoading, actualRooms.length]);

  const bookingPositions = useMemo(() => {
    const start = timelineStart;
    const positions = new Map<
      Booking["id"],
      { offsetX: number; length: number }
    >();

    for (const roomBookings of actualBookingsByRoomSorted.values()) {
      for (const { id, startsAt, endsAt } of roomBookings) {
        const length = msToPx(
          msBetweenDates(startsAt, endsAt),
          pixelsPerMinute,
        );
        const offsetX = msToPx(
          msBetweenDates(start, startsAt),
          pixelsPerMinute,
        );
        positions.set(id, { offsetX, length });
      }
    }

    return positions;
  }, [actualBookingsByRoomSorted, timelineStart, pixelsPerMinute]);

  const interactionCtx = useMemo(
    (): TimelineInteractionContext => ({
      actualRooms,
      actualBookingsByRoomSorted,
      actualBookingsByRoomPrefixMaxEnd,
      pixelsPerMinute,
      sidebarWidth,
      scrollX,
      scrollY,
      timelineStart,
      overlayEl: overlayEl.current,
      scrollerEl: scrollerEl.current,
      now,
    }),
    [
      actualRooms,
      actualBookingsByRoomSorted,
      actualBookingsByRoomPrefixMaxEnd,
      pixelsPerMinute,
      sidebarWidth,
      scrollX,
      scrollY,
      timelineStart,
      now,
    ],
  );

  const interactionCtxRef = useRef(interactionCtx);
  interactionCtxRef.current = interactionCtx;

  const newBookingTouched =
    interactionState.type === "touch-inactive" ||
    interactionState.type === "touch-dragging-edge";

  const newBookingSlotPrevRef = useRef<Slot | null>(null);
  const newBookingSlot = useMemo(() => {
    const newSlot = validSlotByState(interactionCtx, interactionState);
    if (!newSlot) {
      newBookingSlotPrevRef.current = null;
      return null;
    }
    if (
      newBookingSlotPrevRef.current &&
      slotsEqual(newBookingSlotPrevRef.current, newSlot)
    ) {
      return newBookingSlotPrevRef.current;
    }
    newBookingSlotPrevRef.current = newSlot;
    return newSlot;
  }, [interactionCtx, interactionState]);

  const newBookingData = useMemo(() => {
    if (!newBookingSlot) return null;
    return buildNewBookingData(interactionCtx, newBookingSlot);
  }, [interactionCtx, newBookingSlot]);

  const nowRulerCssVars = useMemo(
    () =>
      ({
        "--now-x": px(
          msToPx(msBetween(timelineStart, now), pixelsPerMinute) - scrollX,
        ),
      }) as CSSProperties,
    [timelineStart, now, pixelsPerMinute, scrollX],
  );

  const scrollTo = useCallback(
    (options: ScrollToOptions) => {
      const el = scrollerEl.current;
      if (!el) return;

      const {
        to,
        behavior = "smooth",
        position = "center",
        offsetMs = 0,
      } = options;

      const { width } = el.getBoundingClientRect();
      const toLeftPx = msToPx(
        msBetweenDates(timelineStart, to),
        pixelsPerMinute,
      );

      const scrollLeftPx = (() => {
        switch (position) {
          case "left":
            return toLeftPx;
          case "center":
            return toLeftPx - (width - sidebarWidth) / 2;
          case "right":
            return toLeftPx - (width - sidebarWidth) + 1;
        }
      })();

      el.scrollTo({
        behavior,
        left: scrollLeftPx + msToPx(offsetMs, pixelsPerMinute),
      });
    },
    [timelineStart, pixelsPerMinute, sidebarWidth],
  );

  const scrollToNow = useCallback(
    (options?: Omit<ScrollToOptions, "to">) => {
      scrollTo({
        ...options,
        to: now,
      });
    },
    [now, scrollTo],
  );

  useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

  const didInitialScroll = useRef(false);

  useEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    scrollToNow({
      behavior: "instant",
      position: "left",
      offsetMs: -30 * T.Min,
    });
  }, [scrollToNow]);

  useEffect(() => {
    const el = scrollerEl.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollX(el.scrollLeft);
      setScrollY(el.scrollTop);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollerEl.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollerEl.current;
    if (!el) return;

    const stateType = interactionState.type;
    const eventsMap = createStateListenerTransitionMap(
      interactionCtxRef.current,
      (slot) => onBookRef.current(slot),
    )[stateType];

    const cleanupFns = Object.entries(eventsMap).map(([eventName]) => {
      const listenerWrapped = (event: Event) => {
        setInteractionState((prev) => {
          const ctx = interactionCtxRef.current;
          const transitionMap = createStateListenerTransitionMap(ctx, (slot) =>
            onBookRef.current(slot),
          );
          const handler = transitionMap[prev.type][eventName];
          if (!handler) return prev;
          const newState = handler(event, prev);
          return newState != null ? newState : prev;
        });
      };
      el.addEventListener(eventName, listenerWrapped);
      return () => el.removeEventListener(eventName, listenerWrapped);
    });

    return () => {
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error("Failed to execute cleanup function:", err);
        }
      });
    };
  }, [interactionState.type]);

  function handleBookingClick(event: MouseEvent<HTMLDivElement>) {
    const bookingId = event.currentTarget.dataset.bookingId;
    if (!bookingId) return;

    const booking = actualBookings.get(bookingId);
    if (booking) onBookingClick(booking);
    else console.warn(`Click on undefined booking with ID "${bookingId}".`);
  }

  const timelineStyle = {
    "--sidebar-width": px(sidebarWidth),
    "--header-height": px(HEADER_HEIGHT),
    "--row-height": px(ROW_HEIGHT),
    "--ppm": pixelsPerMinute,
    "--total-width": px(totalTimelineWidth + sidebarWidth),
    "--body-height": px(totalBodyHeight),
    "--container-height": px(containerHeight),
  } as CSSProperties;

  const scrollerStyle = {
    "--visible-left": px(visibleRangePx.left),
    "--visible-width": px(visibleRangePx.width),
  } as CSSProperties;

  const roomsToRender = roomsLoading ? PLACEHOLDER_ROOMS : actualRooms;

  return (
    <div className={cn("flex flex-col items-stretch gap-2", className)}>
      <div
        className={styles.timeline}
        style={timelineStyle}
        data-has-new={newBookingData ? "" : undefined}
        data-new-pressed={
          interactionState.type === "mouse-dragging" || newBookingTouched
            ? ""
            : undefined
        }
        data-new-touched={newBookingTouched ? "" : undefined}
      >
        <div className={cn(styles.corner, "text-base")}>
          {!compactModeEnabled && <h2>Timeline</h2>}
        </div>

        <div ref={scrollerEl} className={styles.scroller} style={scrollerStyle}>
          <div ref={wrapperEl} className={styles.wrapper}>
            <div className={styles.spacer} />

            <svg
              className={styles.rulersSvg}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="Rulers"
                  x={-(scrollX % (pixelsPerMinute * 60))}
                  y="0"
                  width={pixelsPerMinute * 60}
                  height="100%"
                  patternUnits="userSpaceOnUse"
                >
                  <rect x="0" y="0" height="100%" width="1" />
                  <rect
                    x={pixelsPerMinute * 15}
                    y="0"
                    height="100%"
                    width="1"
                    opacity="0.4"
                  />
                  <rect
                    x={pixelsPerMinute * 30}
                    y="0"
                    height="100%"
                    width="1"
                    opacity="0.7"
                  />
                  <rect
                    x={pixelsPerMinute * 45}
                    y="0"
                    height="100%"
                    width="1"
                    opacity="0.4"
                  />
                </pattern>
              </defs>
              <rect fill="url(#Rulers)" width="100%" height="100%" />
            </svg>

            <span className={styles.nowRuler} style={nowRulerCssVars} />
            <div className={styles.nowTimeboxWrapper} style={nowRulerCssVars}>
              <button
                type="button"
                className={cn(styles.nowTimebox, "text-sm")}
                onClick={() => scrollToNow({ position: "center" })}
              >
                {clockTime(now)}
              </button>
            </div>

            <span
              className={styles.newBookingRulerStart}
              style={newBookingData?.cssVars}
            />
            <span
              className={styles.newBookingRulerEnd}
              style={newBookingData?.cssVars}
            />
            <div className={styles.newBookingTimeboxesWrapper}>
              <div
                className={styles.newBookingTimeboxesContainer}
                style={newBookingData?.cssVars}
              >
                <span className={cn(styles.newBookingTimeboxStart, "text-sm")}>
                  {newBookingData?.startTime}
                </span>
                <span className={cn(styles.newBookingTimeboxEnd, "text-sm")}>
                  {newBookingData?.endTime}
                </span>
              </div>
            </div>
            <div className={styles.newBooking} style={newBookingData?.cssVars}>
              <div id={NEW_BOOKING_BOX_ID} className={styles.newBookingInner}>
                <span className="pointer-events-none px-2">
                  {newBookingData?.durationText}
                </span>
              </div>
            </div>

            <div className={cn(styles.header, "text-base text-mauve-500")}>
              {visibleDates.map((day) => (
                <div
                  key={day.toString()}
                  className={styles.headerItem}
                  style={
                    {
                      "--day-offset": px(
                        msToPx(
                          msBetweenDates(timelineStart, day),
                          pixelsPerMinute,
                        ) - scrollX,
                      ),
                    } as CSSProperties
                  }
                >
                  <span className={styles.headerItemDay}>{dayTitle(day)}</span>
                  <div className={styles.headerItemHours}>
                    {HOURS_TIMES.map((h) => (
                      <span key={h}>
                        <span className="text-sm text-mauve-700 dark:text-mauve-600">
                          {h}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={cn(styles.body, "text-base")}>
              {!roomsLoading && !bookingsLoading ? (
                <div className={styles.bookingsLayer}>
                  {actualRooms.map((room) =>
                    rangeIntersectingBookings(
                      interactionCtx,
                      visibleTimeRange.startMs,
                      visibleTimeRange.endMs,
                      room.id,
                    ).map((booking) => (
                      <div
                        key={booking.id}
                        className={styles.booking}
                        style={
                          {
                            "--left": px(
                              (bookingPositions.get(booking.id)?.offsetX ?? 0) -
                                scrollX,
                            ),
                            "--width": px(
                              bookingPositions.get(booking.id)?.length ?? 0,
                            ),
                            "--row-index": room.idx,
                          } as CSSProperties
                        }
                      >
                        <div
                          className={cn(
                            styles.bookingInner,
                            booking.related_to_me && styles.bookingInnerMy,
                          )}
                          title={booking.title}
                          data-booking-id={booking.id}
                          onClick={handleBookingClick}
                        >
                          <span>{sanitizeBookingTitle(booking.title)}</span>
                        </div>
                      </div>
                    )),
                  )}
                </div>
              ) : bookingsLoading ? (
                <div className={styles.bookingsLayer}>
                  {Array.from({
                    length:
                      actualRooms.length || PLACEHOLDER_ROOMS_DEFAULT_COUNT,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(styles.booking, styles.placeholder)}
                      style={
                        {
                          "--row-index": i,
                        } as CSSProperties
                      }
                    >
                      <div className={styles.bookingInner}>
                        <span className="skeleton rounded-md text-transparent">
                          PLACEHOLDER
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.roomList}>
          <div
            className={styles.roomListInner}
            style={{ transform: `translateY(${-scrollY}px)` }}
          >
            {roomsToRender.map((room, i) => (
              <div
                key={room === "placeholder" ? i : room.id}
                className={styles.row}
              >
                <div
                  className={styles.rowHeader}
                  style={
                    {
                      "--row-border-color":
                        room !== "placeholder" && room.access_level
                          ? accessLevelColors[room.access_level]
                          : undefined,
                    } as CSSProperties
                  }
                  title={
                    room === "placeholder"
                      ? undefined
                      : accessLevelTooltip(room.access_level)
                  }
                >
                  {room === "placeholder" ? (
                    <a href="#" className="skeleton w-full rounded-md">
                      xxx
                    </a>
                  ) : (
                    <Link
                      to="/room-booking/rooms/$room"
                      params={{ room: room.id }}
                    >
                      {compactModeEnabled ? room.short_name : room.title}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div ref={overlayEl} className={styles.overlay} />
      </div>

      {newBookingTouched && (
        <div className="bg-base-200/95 border-base-300 fixed right-0 bottom-0 left-0 z-20 border-t px-0 pt-3 shadow-lg backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-center gap-2 px-3 pb-3">
            <button
              type="button"
              className="btn btn-outline grow"
              onClick={() => setInteractionState({ type: "idle" })}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary grow"
              onClick={() => {
                if (
                  interactionState.type === "touch-inactive" ||
                  interactionState.type === "touch-dragging-edge"
                ) {
                  onBook(interactionState.slot);
                  setInteractionState({ type: "idle" });
                }
              }}
            >
              Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
