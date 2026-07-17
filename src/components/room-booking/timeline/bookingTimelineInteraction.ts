import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types";
import type { CSSProperties } from "react";
import {
  clockTime,
  durationFormatted,
  msBetween as msBetweenDates,
  T,
} from "@/lib/utils/dates.ts";
import type { Booking, Room, Slot } from "./types.ts";

export const COMPACT_VERSION_WIDTH_THRESHOLD = 768;

export const SIDEBAR_WIDTH_DEFAULT = 200;
export const SIDEBAR_WIDTH_COMPACT = 65;

export const PIXELS_PER_MINUTE_DEFAULT = 100 / 30;
export const PIXELS_PER_MINUTE_COMPACT = 85 / 30;

export const HEADER_HEIGHT = 60;
export const ROW_HEIGHT = 50;

export const TIME_GRID_SCALE = 5 * T.Min;
export const MIN_BOOKING_DURATION = 15 * T.Min;
export const MAX_BOOKING_DURATION = 3 * T.Hour;

export const NEW_BOOKING_BOX_ID = "new-booking-box";

export const PLACEHOLDER_ROOMS_DEFAULT_COUNT = 18;
export const PLACEHOLDER_ROOMS = Array.from({
  length: PLACEHOLDER_ROOMS_DEFAULT_COUNT,
}).fill("placeholder") as "placeholder"[];

export const HOURS_TIMES = Array.from({ length: 24 })
  .fill(null)
  .map((_, h) => `${h.toString().padStart(2, "0")}:00`);

export const HORIZONTAL_OVERSCAN_PX = 500;

export type Position = {
  room: Room;
  date: Date;
};

export type BookingPosition = {
  offsetX: number;
  length: number;
};

export type InteractionState =
  | { type: "idle" }
  | { type: "mouse-hovering"; hoverAt: Position }
  | { type: "mouse-dragging"; clickAt: Position; dragAt: Position }
  | { type: "touch-inactive"; slot: Slot }
  | {
      type: "touch-dragging-edge";
      slot: Slot;
      edge: "left" | "right";
      touchId: number;
    };

type InteractionState_<S extends InteractionState["type"]> = Extract<
  InteractionState,
  { type: S }
>;

export type TimelineInteractionContext = {
  actualRooms: Room[];
  actualBookingsByRoomSorted: Map<Room["id"], Booking[]>;
  actualBookingsByRoomPrefixMaxEnd: Map<Room["id"], number[]>;
  pixelsPerMinute: number;
  sidebarWidth: number;
  scrollX: number;
  scrollY: number;
  timelineStart: Date;
  overlayEl: HTMLElement | null;
  scrollerEl: HTMLElement | null;
  now: Date;
};

export const px = (n: number) => `${n}px`;

export function msToPx(ms: number, pixelsPerMinute: number) {
  return (ms / T.Min) * pixelsPerMinute;
}

export function msBetween(
  a: Date | number,
  b: Date | number,
  _ctx?: TimelineInteractionContext,
) {
  return msBetweenDates(a, b);
}

export function dayTitle(d: Date) {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

export function touchById(touches: TouchList, id: number): Touch | undefined {
  return Array.from(touches).find(({ identifier }) => identifier === id);
}

export function slotsEqual(a: Slot, b: Slot): boolean {
  return (
    a.room.id === b.room.id &&
    a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime()
  );
}

export function timeGridNeighbors(
  time: number,
  gridScale: number = TIME_GRID_SCALE,
): [number, number] {
  const leftMs = time - (time % gridScale);
  return [leftMs, leftMs + gridScale];
}

export function accessLevelTooltip(
  accessLevel?: RoomAccess_levelAnyOf0 | null,
) {
  if (!accessLevel) return undefined;

  return accessLevel === RoomAccess_levelAnyOf0.yellow
    ? "Yellow access level (for students)"
    : accessLevel === RoomAccess_levelAnyOf0.red
      ? "Red access level (for employees)"
      : "Special rules apply";
}

export function rangeIntersectingBookings(
  ctx: TimelineInteractionContext,
  aMs: number,
  bMs: number,
  roomId: string,
): Booking[] {
  if (aMs > bMs) throw new Error("invalid range limits");

  const bookingsByStart = ctx.actualBookingsByRoomSorted.get(roomId);
  if (!bookingsByStart || bookingsByStart.length === 0) return [];
  const prefixMaxEnd = ctx.actualBookingsByRoomPrefixMaxEnd.get(roomId);
  if (!prefixMaxEnd || prefixMaxEnd.length === 0) return [];

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

  l = 0;
  r = rightExclusive;
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    if (prefixMaxEnd[m] <= aMs) l = m + 1;
    else r = m;
  }
  const leftCandidate = l;
  if (leftCandidate >= rightExclusive) return [];

  const intersecting: Booking[] = [];
  for (let idx = leftCandidate; idx < rightExclusive; idx += 1) {
    const booking = bookingsByStart[idx];
    if (booking.endsAt.getTime() > aMs) {
      intersecting.push(booking);
    }
  }

  return intersecting;
}

function snappedSafeNow(ctx: TimelineInteractionContext) {
  const [, snappedRight] = timeGridNeighbors(ctx.now.getTime() + T.Min);
  return snappedRight;
}

function bookingRangeByHoverDate(
  dateMs: number,
  targetDuration: number,
  gridScale: number = TIME_GRID_SCALE,
): [number, number] {
  const leftMs = dateMs - Math.round(targetDuration / 2);

  const [leftSnap1, leftSnap2] = timeGridNeighbors(leftMs);

  const leftSnappedMs =
    leftMs - leftSnap1 < leftSnap2 - leftMs ? leftSnap1 : leftSnap2;
  const rightSnappedMs =
    leftSnappedMs + Math.ceil(targetDuration / gridScale) * gridScale;

  return [leftSnappedMs, rightSnappedMs];
}

function validRangeForPosition(
  ctx: TimelineInteractionContext,
  posMs: number,
  roomId: Room["id"],
  duration = MIN_BOOKING_DURATION,
): [number, number] | null {
  let [l, r] = bookingRangeByHoverDate(posMs, duration);
  const posWithinRange = () => l <= posMs && posMs <= r;

  const safeLeft = snappedSafeNow(ctx);
  if (l < safeLeft) {
    r += safeLeft - l;
    l = safeLeft;

    if (!posWithinRange()) return null;
  }

  const intersecting = rangeIntersectingBookings(ctx, l, r, roomId);
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

      const adjustedIntersecting = rangeIntersectingBookings(ctx, l, r, roomId);
      if (adjustedIntersecting.length > 0) return null;

      break;
    }
    default:
      return null;
  }

  if (l < safeLeft) return null;

  return [l, r];
}

function validStretchedSlotRange(
  ctx: TimelineInteractionContext,
  roomId: string,
  dInitialMs: number,
  dTargetMs: number,
  maxDuration: number = MAX_BOOKING_DURATION,
): [number, number] | null {
  const safeLeft = snappedSafeNow(ctx);

  if (dInitialMs < safeLeft) return null;

  let l, r;
  if (dInitialMs < dTargetMs) {
    if (dTargetMs - dInitialMs > maxDuration)
      dTargetMs = dInitialMs + maxDuration;

    const firstIntersecting = rangeIntersectingBookings(
      ctx,
      dInitialMs,
      dTargetMs,
      roomId,
    ).at(0);

    if (firstIntersecting) {
      const bl = firstIntersecting.startsAt.getTime();

      if (bl <= dInitialMs) return null;

      dTargetMs = bl;
    }

    l = dInitialMs;
    r = dTargetMs;
  } else {
    if (dInitialMs - dTargetMs > maxDuration)
      dTargetMs = dInitialMs - maxDuration;

    if (dTargetMs < safeLeft) dTargetMs = safeLeft;

    const lastIntersecting = rangeIntersectingBookings(
      ctx,
      dTargetMs,
      dInitialMs,
      roomId,
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

export function clientCoordinatesWithinOverlay(
  ctx: TimelineInteractionContext,
  x0: number,
  y0: number,
): boolean {
  const rect = ctx.overlayEl?.getBoundingClientRect();
  if (!rect) return false;

  const { x, y, width: w, height: h } = rect;

  return x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h;
}

export function positionByClientCoordinates(
  ctx: TimelineInteractionContext,
  x: number,
  y: number,
): Position | null {
  const rect = ctx.scrollerEl?.getBoundingClientRect();

  if (!rect) return null;

  const { x: cornerX, y: cornerY } = rect;

  const viewportX = x - cornerX - ctx.sidebarWidth;
  const viewportY = y - cornerY - HEADER_HEIGHT;

  const timelineX = viewportX + ctx.scrollX;
  const timelineY = viewportY + ctx.scrollY;

  const roomIdx = Math.floor(timelineY / ROW_HEIGHT);
  const room = ctx.actualRooms[roomIdx];
  if (!room) return null;

  const date = new Date(
    ctx.timelineStart.getTime() + (timelineX / ctx.pixelsPerMinute) * T.Min,
  );

  return { room, date };
}

export function validSlotByState(
  ctx: TimelineInteractionContext,
  state: InteractionState,
): Slot | null {
  switch (state.type) {
    case "idle":
      return null;
    case "mouse-hovering": {
      const range = validRangeForPosition(
        ctx,
        state.hoverAt.date.getTime(),
        state.hoverAt.room.id,
      );

      if (!range) return null;

      return {
        room: state.hoverAt.room,
        start: new Date(range[0]),
        end: new Date(range[1]),
      };
    }
    case "mouse-dragging": {
      const range = validRangeForPosition(
        ctx,
        state.clickAt.date.getTime(),
        state.clickAt.room.id,
      );

      if (!range) return null;

      const [l, r] = range;
      const dragMs = state.dragAt.date.getTime();

      let final;
      if (dragMs < l) {
        const [dragSnapped] = timeGridNeighbors(dragMs);
        final = validStretchedSlotRange(
          ctx,
          state.clickAt.room.id,
          r,
          dragSnapped,
        );
      } else if (dragMs > r) {
        const [, dragSnapped] = timeGridNeighbors(dragMs);
        final = validStretchedSlotRange(
          ctx,
          state.clickAt.room.id,
          l,
          dragSnapped,
        );
      } else {
        final = [l, r];
      }

      if (!final) return null;

      return {
        room: state.clickAt.room,
        start: new Date(final[0]),
        end: new Date(final[1]),
      };
    }
    case "touch-inactive":
      return state.slot;
    case "touch-dragging-edge":
      return state.slot;
    default:
      return state satisfies never;
  }
}

function transition1_mousemove(
  ctx: TimelineInteractionContext,
  event: MouseEvent,
): InteractionState | null {
  if (isTouchEvent(event)) return null;

  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(ctx, clientX, clientY))
    return { type: "idle" };

  const pos = positionByClientCoordinates(ctx, clientX, clientY);
  if (!pos) return { type: "idle" };

  return {
    type: "mouse-hovering",
    hoverAt: pos,
  };
}

function transition2_mousedown(
  ctx: TimelineInteractionContext,
  event: MouseEvent,
  state: InteractionState,
): InteractionState | null {
  if (isTouchEvent(event) && state.type !== "idle") return null;

  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(ctx, clientX, clientY))
    return { type: "idle" };

  const pos = positionByClientCoordinates(ctx, clientX, clientY);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  if (isTouchEvent(event)) {
    const slot = validSlotByState(ctx, {
      type: "mouse-hovering",
      hoverAt: pos,
    });

    if (!slot) return null;

    return {
      type: "touch-inactive",
      slot,
    };
  }

  return {
    type: "mouse-dragging",
    clickAt: pos,
    dragAt: pos,
  };
}

function transition3_mouseleave(_: MouseEvent): InteractionState {
  return { type: "idle" };
}

function transition4_mousemove(
  ctx: TimelineInteractionContext,
  event: MouseEvent,
  state: InteractionState_<"mouse-dragging">,
): InteractionState | null {
  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(ctx, clientX, clientY)) return null;

  const pos = positionByClientCoordinates(ctx, clientX, clientY);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  return {
    type: "mouse-dragging",
    clickAt: state.clickAt,
    dragAt: pos,
  };
}

function transition5_touchend(
  event: TouchEvent,
  state: InteractionState_<"touch-dragging-edge">,
): InteractionState | null {
  const touch = touchById(event.changedTouches, state.touchId);
  if (!touch) return null;

  event.preventDefault();

  return {
    type: "touch-inactive",
    slot: state.slot,
  };
}

let lastTouchTimeStamp = -100000000;
const isTouchEvent = (e: Event) =>
  Math.abs(lastTouchTimeStamp - e.timeStamp) < T.Sec;

type StateTransitionHandler = (
  event: Event,
  state: InteractionState,
) => InteractionState | null | undefined;

export type StateListenerTransitionMap = Record<
  InteractionState["type"],
  Record<string, StateTransitionHandler>
>;

export function createStateListenerTransitionMap(
  ctx: TimelineInteractionContext,
  onBook: (slot: Slot) => void,
): StateListenerTransitionMap {
  return {
    idle: {
      touchstart: (event) => {
        lastTouchTimeStamp = event.timeStamp;
        return null;
      },
      mousemove: (event) => transition1_mousemove(ctx, event as MouseEvent),
      mousedown: (event, state) =>
        transition2_mousedown(ctx, event as MouseEvent, state),
    },
    "mouse-hovering": {
      mousemove: (event) => transition1_mousemove(ctx, event as MouseEvent),
      mousedown: (event, state) =>
        transition2_mousedown(ctx, event as MouseEvent, state),
      mouseleave: () => transition3_mouseleave({} as MouseEvent),
    },
    "mouse-dragging": {
      mousemove: (event, state) =>
        transition4_mousemove(
          ctx,
          event as MouseEvent,
          state as InteractionState_<"mouse-dragging">,
        ),
      mouseup: (event, state) => {
        event.preventDefault();
        const slot = validSlotByState(ctx, state);

        if (slot) onBook(slot);

        return { type: "idle" };
      },
    },
    "touch-inactive": {
      touchstart: (event, state) => {
        const touchEvent = event as TouchEvent;
        const [touch] = touchEvent.changedTouches;
        const { clientX: x0, clientY: y0 } = touch;

        if (!clientCoordinatesWithinOverlay(ctx, x0, y0)) return null;

        const boxRect = document
          .getElementById(NEW_BOOKING_BOX_ID)
          ?.getBoundingClientRect();
        if (!boxRect) return null;

        const touchedEdge = (() => {
          const { x, y, width, height } = boxRect;

          if (!(y - 6 <= y0 && y0 <= y + height + 6)) return null;

          const distToLeft = Math.abs(x0 - x);
          const distToRight = Math.abs(x0 - (x + width));

          if (distToLeft < distToRight && distToLeft < 12) return "left";
          if (distToRight < distToLeft && distToRight < 12) return "right";

          return null;
        })();

        if (!touchedEdge) return null;

        touchEvent.preventDefault();

        return {
          type: "touch-dragging-edge",
          slot: (state as InteractionState_<"touch-inactive">).slot,
          edge: touchedEdge,
          touchId: touch.identifier,
        };
      },
    },
    "touch-dragging-edge": {
      touchmove: (event, state) => {
        const touchEvent = event as TouchEvent;
        const touchState = state as InteractionState_<"touch-dragging-edge">;
        const touch = touchById(touchEvent.changedTouches, touchState.touchId);
        if (!touch) return null;

        touchEvent.preventDefault();

        const { clientX, clientY } = touch;

        if (!clientCoordinatesWithinOverlay(ctx, clientX, clientY)) return null;

        const pos = positionByClientCoordinates(ctx, clientX, clientY);
        if (!pos) return null;

        let toMs = pos.date.getTime();
        let fromMs;
        switch (touchState.edge) {
          case "left":
            fromMs = touchState.slot.end.getTime();
            toMs = timeGridNeighbors(toMs)[0];
            break;
          case "right":
            fromMs = touchState.slot.start.getTime();
            toMs = timeGridNeighbors(toMs)[1];
            break;
        }

        const newRange = validStretchedSlotRange(
          ctx,
          touchState.slot.room.id,
          fromMs,
          toMs,
        );
        if (!newRange) return { type: "idle" };

        const newStart = new Date(newRange[0]);
        const newEnd = new Date(newRange[1]);

        if (msBetweenDates(newStart, newEnd) < MIN_BOOKING_DURATION)
          return null;

        return {
          ...touchState,
          slot: {
            room: touchState.slot.room,
            start: newStart,
            end: newEnd,
          },
        };
      },
      touchend: (event, state) =>
        transition5_touchend(
          event as TouchEvent,
          state as InteractionState_<"touch-dragging-edge">,
        ),
      touchcancel: (event, state) =>
        transition5_touchend(
          event as TouchEvent,
          state as InteractionState_<"touch-dragging-edge">,
        ),
    },
  };
}

export function buildNewBookingData(
  ctx: TimelineInteractionContext,
  slot: Slot,
) {
  const duration = msBetweenDates(slot.start, slot.end);

  const absoluteX = msToPx(
    msBetweenDates(ctx.timelineStart, slot.start),
    ctx.pixelsPerMinute,
  );
  const viewportX = absoluteX - ctx.scrollX;

  return {
    duration,
    durationText: durationFormatted(duration),
    startTime: clockTime(slot.start),
    endTime: clockTime(slot.end),
    cssVars: {
      "--new-x": px(viewportX),
      "--new-y": px(slot.room.idx * ROW_HEIGHT),
      "--new-length": px(msToPx(duration, ctx.pixelsPerMinute)),
    } as CSSProperties,
  };
}
