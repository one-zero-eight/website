import { T, msBetween } from "@/lib/utils/dates";
import type { Booking, Room, Slot } from "./types";

/* ========================================================================== */
/* =============================== Constants ================================ */
/* ========================================================================== */

export const TIME_GRID_SCALE = 5 * T.Min;
export const MIN_BOOKING_DURATION = 15 * T.Min;
export const MAX_BOOKING_DURATION = 3 * T.Hour;

/* ========================================================================== */
/* =========================== Conversion Helpers =========================== */
/* ========================================================================== */

export function msToPx(ms: number, pixelsPerMinute: number): number {
  return (ms / T.Min) * pixelsPerMinute;
}

export function pxToMs(px: number, pixelsPerMinute: number): number {
  return (px / pixelsPerMinute) * T.Min;
}

/* ========================================================================== */
/* ========================= Date/Time Formatting =========================== */
/* ========================================================================== */

export function dayTitle(d: Date): string {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

/* ========================================================================== */
/* =========================== Slot Comparisons ============================= */
/* ========================================================================== */

export function slotsEqual(a: Slot, b: Slot): boolean {
  return (
    a.room.id === b.room.id &&
    a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime()
  );
}

/* ========================================================================== */
/* =========================== Time Grid Helpers ============================ */
/* ========================================================================== */

export function timeGridNeighbors(
  time: number,
  gridScale: number = TIME_GRID_SCALE,
): [number, number] {
  const leftMs = time - (time % gridScale);
  return [leftMs, leftMs + gridScale];
}

export function snappedSafeNow(
  now: Date,
  gridScale: number = TIME_GRID_SCALE,
): number {
  const [, snappedRight] = timeGridNeighbors(now.getTime() + T.Min, gridScale);
  return snappedRight;
}

/* ========================================================================== */
/* ======================= Booking Range Calculation ======================== */
/* ========================================================================== */

export function bookingRangeByHoverDate(
  dateMs: number,
  targetDuration: number,
  gridScale: number = TIME_GRID_SCALE,
): [number, number] {
  const leftMs = dateMs - Math.round(targetDuration / 2);

  const [leftSnap1, leftSnap2] = timeGridNeighbors(leftMs, gridScale);

  const leftSnappedMs =
    leftMs - leftSnap1 < leftSnap2 - leftMs ? leftSnap1 : leftSnap2;
  const rightSnappedMs =
    leftSnappedMs + Math.ceil(targetDuration / gridScale) * gridScale;

  return [leftSnappedMs, rightSnappedMs];
}

/* ========================================================================== */
/* ===================== Booking Intersection Search ======================== */
/* ========================================================================== */

/**
 * Given a time range and room ID, returns a list of all bookings that intersect
 * this range, if any. Uses binary search on pre-sorted bookings.
 *
 * Note: booking is not considered intersecting if it "touches" the range only
 * with 1ms.
 */
export function rangeIntersectingBookings(
  aMs: number,
  bMs: number,
  roomId: string,
  bookingsByRoomSorted: Map<string, Booking[]>,
  bookingsByRoomPrefixMaxEnd: Map<string, number[]>,
): Booking[] {
  if (aMs > bMs) return [];

  const bookingsByStart = bookingsByRoomSorted.get(roomId);
  if (!bookingsByStart || bookingsByStart.length === 0) return [];
  const prefixMaxEnd = bookingsByRoomPrefixMaxEnd.get(roomId);
  if (!prefixMaxEnd || prefixMaxEnd.length === 0) return [];

  // 1) Find first index where startsAt >= bMs.
  let l = 0;
  let r = bookingsByStart.length;

  while (l < r) {
    const m = Math.floor((l + r) / 2);
    const startsMs = bookingsByStart[m].startsAt.getTime();
    if (startsMs < bMs) l = m + 1;
    else r = m;
  }

  const rightExclusive = l;
  if (rightExclusive === 0) return [];

  // 2) Find first index where some booking in [0..idx] can intersect by end.
  l = 0;
  r = rightExclusive;
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    if (prefixMaxEnd[m] <= aMs) l = m + 1;
    else r = m;
  }
  const leftCandidate = l;
  if (leftCandidate >= rightExclusive) return [];

  // 3) Keep bookings that satisfy both conditions.
  const intersecting: Booking[] = [];
  for (let idx = leftCandidate; idx < rightExclusive; idx += 1) {
    const booking = bookingsByStart[idx];
    if (booking.endsAt.getTime() > aMs) {
      intersecting.push(booking);
    }
  }

  return intersecting;
}

/* ========================================================================== */
/* ======================= Range Validation ================================= */
/* ========================================================================== */

export function validRangeForPosition(
  posMs: number,
  roomId: Room["id"],
  params: {
    now: Date;
    duration?: number;
    bookingsByRoomSorted: Map<string, Booking[]>;
    bookingsByRoomPrefixMaxEnd: Map<string, number[]>;
    gridScale?: number;
  },
): [number, number] | null {
  const {
    now,
    duration = MIN_BOOKING_DURATION,
    bookingsByRoomSorted,
    bookingsByRoomPrefixMaxEnd,
    gridScale = TIME_GRID_SCALE,
  } = params;

  let [l, r] = bookingRangeByHoverDate(posMs, duration, gridScale);
  const posWithinRange = () => l <= posMs && posMs <= r;

  // 1. Make sure range is after now.
  const safeLeft = snappedSafeNow(now, gridScale);
  if (l < safeLeft) {
    r += safeLeft - l;
    l = safeLeft;

    if (!posWithinRange()) return null;
  }

  // 2. Make sure range doesn't interfere with other bookings.
  const intersecting = rangeIntersectingBookings(
    l,
    r,
    roomId,
    bookingsByRoomSorted,
    bookingsByRoomPrefixMaxEnd,
  );
  switch (intersecting.length) {
    case 0:
      break;
    case 1: {
      const bl = intersecting[0].startsAt.getTime();
      const br = intersecting[0].endsAt.getTime();

      if (l < br && br < r) {
        r += br - l;
        l = br;
      } else if (l < bl && bl < r) {
        l -= r - bl;
        r = bl;
      } else {
        return null;
      }

      if (!posWithinRange()) return null;

      const adjustedIntersecting = rangeIntersectingBookings(
        l,
        r,
        roomId,
        bookingsByRoomSorted,
        bookingsByRoomPrefixMaxEnd,
      );
      if (adjustedIntersecting.length > 0) return null;

      break;
    }
    default:
      return null;
  }

  // 3. May be before now after adjusting.
  if (l < safeLeft) return null;

  return [l, r];
}

/**
 * Given a room ID, initial date and target date, returns a time range
 * such that one of its boundaries is the `dInitialMs` and the second one
 * is the date that is as close as possible to the `dTargetMs` such that
 * the resulting range is a valid slot for booking the room.
 */
export function validStretchedSlotRange(
  roomId: string,
  dInitialMs: number,
  dTargetMs: number,
  params: {
    now: Date;
    maxDuration?: number;
    bookingsByRoomSorted: Map<string, Booking[]>;
    bookingsByRoomPrefixMaxEnd: Map<string, number[]>;
    gridScale?: number;
  },
): [number, number] | null {
  const {
    now,
    maxDuration = MAX_BOOKING_DURATION,
    bookingsByRoomSorted,
    bookingsByRoomPrefixMaxEnd,
    gridScale = TIME_GRID_SCALE,
  } = params;

  const safeLeft = snappedSafeNow(now, gridScale);

  if (dInitialMs < safeLeft) return null;

  let l: number;
  let r: number;

  if (dInitialMs < dTargetMs) {
    // Stretching to the right.
    if (dTargetMs - dInitialMs > maxDuration)
      dTargetMs = dInitialMs + maxDuration;

    const firstIntersecting = rangeIntersectingBookings(
      dInitialMs,
      dTargetMs,
      roomId,
      bookingsByRoomSorted,
      bookingsByRoomPrefixMaxEnd,
    ).at(0);

    if (firstIntersecting) {
      const bl = firstIntersecting.startsAt.getTime();
      if (bl <= dInitialMs) return null;
      dTargetMs = bl;
    }

    l = dInitialMs;
    r = dTargetMs;
  } else {
    // Stretching to the left.
    if (dInitialMs - dTargetMs > maxDuration)
      dTargetMs = dInitialMs - maxDuration;

    if (dTargetMs < safeLeft) dTargetMs = safeLeft;

    const lastIntersecting = rangeIntersectingBookings(
      dTargetMs,
      dInitialMs,
      roomId,
      bookingsByRoomSorted,
      bookingsByRoomPrefixMaxEnd,
    ).at(-1);

    if (lastIntersecting) {
      const br = lastIntersecting.endsAt.getTime();
      if (br >= dInitialMs) return null;
      dTargetMs = br;
    }

    l = dTargetMs;
    r = dInitialMs;
  }

  return [l, r];
}

/* ========================================================================== */
/* ===================== Coordinate Conversion ============================== */
/* ========================================================================== */

export function clientCoordinatesWithinOverlay(
  x: number,
  y: number,
  overlayEl: HTMLElement | null,
): boolean {
  const rect = overlayEl?.getBoundingClientRect();
  if (!rect) return false;

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export interface PositionByClientParams {
  x: number;
  y: number;
  scrollerEl: HTMLElement | null;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  scrollX: number;
  scrollY: number;
  timelineStart: Date;
  pixelsPerMinute: number;
  rooms: Room[];
}

export type Position = {
  room: Room;
  date: Date;
};

export function positionByClientCoordinates(
  params: PositionByClientParams,
): Position | null {
  const {
    x,
    y,
    scrollerEl,
    sidebarWidth,
    headerHeight,
    rowHeight,
    scrollX,
    scrollY,
    timelineStart,
    pixelsPerMinute,
    rooms,
  } = params;

  const rect = scrollerEl?.getBoundingClientRect();
  if (!rect) return null;

  // Convert client coordinates to position within scroller viewport
  const viewportX = x - rect.left - sidebarWidth;
  const viewportY = y - rect.top - headerHeight;

  // Account for scroll position to get absolute timeline position
  const timelineX = viewportX + scrollX;
  const timelineY = viewportY + scrollY;

  const roomIdx = Math.floor(timelineY / rowHeight);
  const room = rooms[roomIdx];
  if (!room) return null;

  const date = new Date(
    timelineStart.getTime() + pxToMs(timelineX, pixelsPerMinute),
  );

  return { room, date };
}

/* ========================================================================== */
/* ===================== Booking Positions ================================== */
/* ========================================================================== */

export type BookingPosition = {
  offsetX: number;
  length: number;
};

export function computeBookingPositions(
  timelineStart: Date,
  pixelsPerMinute: number,
  bookingsByRoomSorted: Map<string, Booking[]>,
): Map<string, BookingPosition> {
  const start = timelineStart.getTime();
  const positions = new Map<string, BookingPosition>();

  for (const bookings of bookingsByRoomSorted.values()) {
    for (const { id, startsAt, endsAt } of bookings) {
      const length = msToPx(msBetween(startsAt, endsAt), pixelsPerMinute);
      const offsetX = msToPx(startsAt.getTime() - start, pixelsPerMinute);
      positions.set(id, { offsetX, length });
    }
  }

  return positions;
}

/* ========================================================================== */
/* ===================== Data Preparation =================================== */
/* ========================================================================== */

export function buildBookingsByRoomSorted(
  bookings: Booking[] | undefined,
): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>();

  for (const booking of bookings ?? []) {
    const list = map.get(booking.room_id);
    if (list) list.push(booking);
    else map.set(booking.room_id, [booking]);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  return map;
}

export function buildBookingsByRoomPrefixMaxEnd(
  bookingsByRoomSorted: Map<string, Booking[]>,
): Map<string, number[]> {
  const map = new Map<string, number[]>();

  for (const [roomId, bookings] of bookingsByRoomSorted.entries()) {
    const prefixMaxEnd: number[] = [];
    let maxEnd = Number.NEGATIVE_INFINITY;

    for (const booking of bookings) {
      const endMs = booking.endsAt.getTime();
      if (endMs > maxEnd) maxEnd = endMs;
      prefixMaxEnd.push(maxEnd);
    }

    map.set(roomId, prefixMaxEnd);
  }

  return map;
}

/* ========================================================================== */
/* ===================== Visible Range Calculation ========================== */
/* ========================================================================== */

export function computeVisibleDates(
  timelineDates: Date[],
  visibleTimeStartMs: number,
  visibleTimeEndMs: number,
): Date[] {
  return timelineDates.filter((date) => {
    const dayStart = date.getTime();
    const dayEnd = dayStart + T.Day;
    return dayEnd > visibleTimeStartMs && dayStart < visibleTimeEndMs;
  });
}

export function computeTimelineDates(
  timelineStart: Date,
  timelineEnd: Date,
): Date[] {
  const dates: Date[] = [];
  let date = new Date(timelineStart.getTime());
  const end = timelineEnd.getTime();

  while (date.getTime() < end) {
    dates.push(date);
    date = new Date(date.getTime() + T.Day);
  }

  return dates;
}
