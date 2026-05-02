import { T, msBetween } from "@/lib/utils/dates";
import type { Booking, Room, Slot } from "./types";
import {
  clientCoordinatesWithinOverlay,
  MIN_BOOKING_DURATION,
  positionByClientCoordinates,
  timeGridNeighbors,
  validRangeForPosition,
  validStretchedSlotRange,
  type Position,
} from "./utils";

/* ========================================================================== */
/* =========================== InteractionState ============================= */
/* ========================================================================== */

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

/* ========================================================================== */
/* ========================= Transition Context ============================= */
/* ========================================================================== */

export interface MachineContext {
  overlayEl: HTMLElement | null;
  scrollerEl: HTMLElement | null;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  scrollX: number;
  scrollY: number;
  timelineStart: Date;
  pixelsPerMinute: number;
  rooms: Room[];
  now: Date;
  bookingsByRoomSorted: Map<string, Booking[]>;
  bookingsByRoomPrefixMaxEnd: Map<string, number[]>;
  lastTouchTimeStampRef: { current: number };
  newBookingBoxId: string;
}

/* ========================================================================== */
/* ====================== validSlotByState ================================== */
/* ========================================================================== */

export function validSlotByState(
  state: InteractionState,
  ctx: MachineContext,
): Slot | null {
  const { now, bookingsByRoomSorted, bookingsByRoomPrefixMaxEnd } = ctx;

  switch (state.type) {
    case "idle":
      return null;

    case "mouse-hovering": {
      const range = validRangeForPosition(
        state.hoverAt.date.getTime(),
        state.hoverAt.room.id,
        {
          now,
          bookingsByRoomSorted,
          bookingsByRoomPrefixMaxEnd,
        },
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
        state.clickAt.date.getTime(),
        state.clickAt.room.id,
        {
          now,
          bookingsByRoomSorted,
          bookingsByRoomPrefixMaxEnd,
        },
      );
      if (!range) return null;

      const [l, r] = range;
      const dragMs = state.dragAt.date.getTime();

      let final: [number, number] | null;
      if (dragMs < l) {
        const [dragSnapped] = timeGridNeighbors(dragMs);
        final = validStretchedSlotRange(state.clickAt.room.id, r, dragSnapped, {
          now,
          bookingsByRoomSorted,
          bookingsByRoomPrefixMaxEnd,
        });
      } else if (dragMs > r) {
        const [, dragSnapped] = timeGridNeighbors(dragMs);
        final = validStretchedSlotRange(state.clickAt.room.id, l, dragSnapped, {
          now,
          bookingsByRoomSorted,
          bookingsByRoomPrefixMaxEnd,
        });
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

/* ========================================================================== */
/* ====================== Touch Event Helpers =============================== */
/* ========================================================================== */

function touchById(touches: TouchList, id: number): Touch | undefined {
  for (let i = 0; i < touches.length; i++) {
    if (touches[i].identifier === id) return touches[i];
  }
  return undefined;
}

function isTouchEvent(
  e: Event,
  lastTouchTimeStampRef: { current: number },
): boolean {
  return Math.abs(lastTouchTimeStampRef.current - e.timeStamp) < T.Sec;
}

function detectTouchedEdge(
  clientX: number,
  clientY: number,
  newBookingBoxId: string,
): "left" | "right" | null {
  const boxRect = document
    .getElementById(newBookingBoxId)
    ?.getBoundingClientRect();
  if (!boxRect) return null;

  const { x, y, width, height } = boxRect;

  // Vertical hit test with 6px tolerance
  if (!(y - 6 <= clientY && clientY <= y + height + 6)) return null;

  const distToLeft = Math.abs(clientX - x);
  const distToRight = Math.abs(clientX - (x + width));

  if (distToLeft < distToRight && distToLeft < 12) return "left";
  if (distToRight < distToLeft && distToRight < 12) return "right";

  return null;
}

/* ========================================================================== */
/* ====================== Transition Functions ============================== */
/* ========================================================================== */

function posFromEvent(
  e: MouseEvent | Touch,
  ctx: MachineContext,
): Position | null {
  return positionByClientCoordinates({
    x: e.clientX,
    y: e.clientY,
    scrollerEl: ctx.scrollerEl,
    sidebarWidth: ctx.sidebarWidth,
    headerHeight: ctx.headerHeight,
    rowHeight: ctx.rowHeight,
    scrollX: ctx.scrollX,
    scrollY: ctx.scrollY,
    timelineStart: ctx.timelineStart,
    pixelsPerMinute: ctx.pixelsPerMinute,
    rooms: ctx.rooms,
  });
}

function isWithinOverlay(e: MouseEvent | Touch, ctx: MachineContext): boolean {
  return clientCoordinatesWithinOverlay(e.clientX, e.clientY, ctx.overlayEl);
}

function transitionMousemove(
  event: MouseEvent,
  _currentState: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (isTouchEvent(event, ctx.lastTouchTimeStampRef)) return null;

  if (!isWithinOverlay(event, ctx)) return { type: "idle" };

  const pos = posFromEvent(event, ctx);
  if (!pos) return { type: "idle" };

  return { type: "mouse-hovering", hoverAt: pos };
}

function transitionMousedown(
  event: MouseEvent,
  state: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (isTouchEvent(event, ctx.lastTouchTimeStampRef) && state.type !== "idle")
    return null;

  if (!isWithinOverlay(event, ctx)) return { type: "idle" };

  const pos = posFromEvent(event, ctx);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  if (isTouchEvent(event, ctx.lastTouchTimeStampRef)) {
    const slot = validSlotByState(
      { type: "mouse-hovering", hoverAt: pos },
      ctx,
    );
    if (!slot) return null;
    return { type: "touch-inactive", slot };
  }

  return { type: "mouse-dragging", clickAt: pos, dragAt: pos };
}

function transitionMouseleave(
  _event: MouseEvent,
  _state: InteractionState,
  _ctx: MachineContext,
): InteractionState {
  return { type: "idle" };
}

function transitionDragMousemove(
  event: MouseEvent,
  state: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (state.type !== "mouse-dragging") return null;
  if (!isWithinOverlay(event, ctx)) return null;

  const pos = posFromEvent(event, ctx);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  return {
    type: "mouse-dragging",
    clickAt: state.clickAt,
    dragAt: pos,
  };
}

function transitionDragMouseup(
  _event: MouseEvent,
  state: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (state.type !== "mouse-dragging") return null;
  const slot = validSlotByState(state, ctx);
  if (slot) {
    return { type: "idle", _emitSlot: slot } as InteractionState & {
      _emitSlot?: Slot;
    };
  }
  return { type: "idle" };
}

function transitionTouchstartInactive(
  event: TouchEvent,
  state: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (state.type !== "touch-inactive") return null;
  const [touch] = event.changedTouches;
  if (!touch) return null;
  const { clientX, clientY } = touch;

  if (!isWithinOverlay(touch, ctx)) return null;

  const touchedEdge = detectTouchedEdge(clientX, clientY, ctx.newBookingBoxId);
  if (!touchedEdge) return null;

  event.preventDefault();

  return {
    type: "touch-dragging-edge",
    slot: state.slot,
    edge: touchedEdge,
    touchId: touch.identifier,
  };
}

function transitionTouchmoveEdge(
  event: TouchEvent,
  state: InteractionState,
  ctx: MachineContext,
): InteractionState | null {
  if (state.type !== "touch-dragging-edge") return null;
  const touch = touchById(event.changedTouches, state.touchId);
  if (!touch) return null;

  event.preventDefault();

  if (!isWithinOverlay(touch, ctx)) return null;

  const pos = posFromEvent(touch, ctx);
  if (!pos) return null;

  let toMs = pos.date.getTime();
  let fromMs: number;
  switch (state.edge) {
    case "left":
      fromMs = state.slot.end.getTime();
      toMs = timeGridNeighbors(toMs)[0];
      break;
    case "right":
      fromMs = state.slot.start.getTime();
      toMs = timeGridNeighbors(toMs)[1];
      break;
  }

  const newRange = validStretchedSlotRange(state.slot.room.id, fromMs, toMs, {
    now: ctx.now,
    bookingsByRoomSorted: ctx.bookingsByRoomSorted,
    bookingsByRoomPrefixMaxEnd: ctx.bookingsByRoomPrefixMaxEnd,
  });
  if (!newRange) return { type: "idle" };

  const newStart = new Date(newRange[0]);
  const newEnd = new Date(newRange[1]);

  if (msBetween(newStart, newEnd) < MIN_BOOKING_DURATION) return null;

  return {
    ...state,
    slot: {
      room: state.slot.room,
      start: newStart,
      end: newEnd,
    },
  };
}

function transitionTouchendEdge(
  event: TouchEvent,
  state: InteractionState,
  _ctx: MachineContext,
): InteractionState | null {
  if (state.type !== "touch-dragging-edge") return null;
  const touch = touchById(event.changedTouches, state.touchId);
  if (!touch) return null;

  event.preventDefault();

  return {
    type: "touch-inactive",
    slot: state.slot,
  };
}

/* ========================================================================== */
/* ====================== State Listener Maps =============================== */
/* ========================================================================== */

export type EventWithResult = {
  eventType: string;
  handler: (
    event: any,
    state: InteractionState,
    ctx: MachineContext,
  ) => InteractionState | null;
};

export function getListenersForState(
  stateType: InteractionState["type"],
): EventWithResult[] {
  switch (stateType) {
    case "idle":
      return [
        {
          eventType: "touchstart",
          handler: (event, _state, ctx) => {
            ctx.lastTouchTimeStampRef.current = event.timeStamp;
            return null;
          },
        },
        { eventType: "mousemove", handler: transitionMousemove },
        { eventType: "mousedown", handler: transitionMousedown },
      ];

    case "mouse-hovering":
      return [
        { eventType: "mousemove", handler: transitionMousemove },
        { eventType: "mousedown", handler: transitionMousedown },
        { eventType: "mouseleave", handler: transitionMouseleave },
      ];

    case "mouse-dragging":
      return [
        { eventType: "mousemove", handler: transitionDragMousemove },
        {
          eventType: "mouseup",
          handler: (event, state, ctx) => {
            event.preventDefault();
            const result = transitionDragMouseup(
              event as MouseEvent,
              state as Extract<InteractionState, { type: "mouse-dragging" }>,
              ctx,
            );
            return result;
          },
        },
      ];

    case "touch-inactive":
      return [
        {
          eventType: "touchstart",
          handler: transitionTouchstartInactive as (
            event: Event,
            state: InteractionState,
            ctx: MachineContext,
          ) => InteractionState | null,
        },
      ];

    case "touch-dragging-edge":
      return [
        {
          eventType: "touchmove",
          handler: transitionTouchmoveEdge as (
            event: Event,
            state: InteractionState,
            ctx: MachineContext,
          ) => InteractionState | null,
        },
        {
          eventType: "touchend",
          handler: transitionTouchendEdge as (
            event: Event,
            state: InteractionState,
            ctx: MachineContext,
          ) => InteractionState | null,
        },
        {
          eventType: "touchcancel",
          handler: transitionTouchendEdge as (
            event: Event,
            state: InteractionState,
            ctx: MachineContext,
          ) => InteractionState | null,
        },
      ];

    default:
      return stateType satisfies never;
  }
}

/* ========================================================================== */
/* ==================== State Equality (perf optimization) ================== */
/* ========================================================================== */

/** Snap a Date's milliseconds to the 5-minute time grid. */
function snappedMs(d: Date): number {
  const GRID = 5 * 60 * 1000;
  return d.getTime() - (d.getTime() % GRID);
}

/**
 * Returns true when two interaction states are "effectively equal" — they'd
 * produce the same valid slot. Used to skip setState during mousemove drag
 * when the pixel movement hasn't crossed a grid boundary or changed rooms.
 */
export function interactionStatesEqual(
  a: InteractionState,
  b: InteractionState,
): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "idle":
      return true;
    case "mouse-hovering": {
      const bh = b as typeof a;
      return (
        a.hoverAt.room.id === bh.hoverAt.room.id &&
        a.hoverAt.date.getTime() === bh.hoverAt.date.getTime()
      );
    }
    case "mouse-dragging": {
      const bd = b as typeof a;
      return (
        a.clickAt.room.id === bd.clickAt.room.id &&
        a.clickAt.date.getTime() === bd.clickAt.date.getTime() &&
        a.dragAt.room.id === bd.dragAt.room.id &&
        snappedMs(a.dragAt.date) === snappedMs(bd.dragAt.date)
      );
    }
    case "touch-inactive": {
      const bt = b as typeof a;
      return (
        a.slot.room.id === bt.slot.room.id &&
        a.slot.start.getTime() === bt.slot.start.getTime() &&
        a.slot.end.getTime() === bt.slot.end.getTime()
      );
    }
    case "touch-dragging-edge": {
      const be = b as typeof a;
      return (
        a.edge === be.edge &&
        a.touchId === be.touchId &&
        a.slot.room.id === be.slot.room.id &&
        a.slot.start.getTime() === be.slot.start.getTime() &&
        a.slot.end.getTime() === be.slot.end.getTime()
      );
    }
    default:
      return a satisfies never;
  }
}
