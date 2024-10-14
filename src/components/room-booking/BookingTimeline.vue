<script setup lang="ts">
import type { MaybeRef } from "vue";
import { roomBookingFetch, type roomBookingTypes } from "@/api/room-booking";
import { useMediaQuery, useNow } from "@vueuse/core";
import { computed, onMounted, ref, shallowRef, unref, watch } from "vue";

/* ========================================================================== */
/* ================================ Options ================================= */
/* ========================================================================== */

const emit = defineEmits<{
  book: [slot: Slot];
  bookingClick: [booking: Booking];
}>();

/* ========================================================================== */
/* =============================== Constants ================================ */
/* ========================================================================== */

const COMPACT_VERSION_THRESHOLD_PX = 768;

const SIDEBAR_WIDTH_DEFAULT = 200;
const SIDEBAR_WIDTH_COMPACT = 65;

const PIXELS_PER_MINUTE_DEFAULT = 100 / 30;
const PIXELS_PER_MINUTE_COMPACT = 85 / 30;

const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 50;

const MIN_BOOKING_DURATION_MINUTES = 15;
const BOOKING_DURATION_STEP = 5;

const NEW_BOOKING_BOX_ID = "new-booking-box";

const T = {
  Ms: 1,
  Sec: 1000,
  Min: 1000 * 60,
  Hour: 1000 * 60 * 60,
  Day: 1000 * 60 * 60 * 24,
};

const PLACEHOLDER_ROOMS = Array.from({ length: 15 }).fill(
  "placeholder",
) as "placeholder"[];

const PLACEHOLDER_BOOKINGS = Array.from({ length: 10 }).fill(
  "placeholder",
) as "placeholder"[];

const HOURS_TIMES = Array.from({ length: 24 })
  .fill(null)
  .map((_, h) => `${h.toString().padStart(2, "0")}:00`);

/* ========================================================================== */
/* ================================= Types ================================== */
/* ========================================================================== */

export type Room = roomBookingTypes.SchemaRoom & {
  /** Index of the room in the list of all rooms on the timeline. */
  idx: number;
};

export type Booking = Omit<roomBookingTypes.SchemaBooking, "start" | "end"> & {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

export type Slot = {
  room: Room;
  start: Date;
  end: Date;
};

type Position = {
  room: Room;
  date: Date;
};

type BookingPosition = {
  offsetX: number;
  length: number;
};

/* ========================================================================== */
/* ============================== Compact Mode ============================== */
/* ========================================================================== */

const compactModeEnabled = useMediaQuery(
  `(max-width: ${COMPACT_VERSION_THRESHOLD_PX}px)`,
);
const sidebarWidth = computed(() =>
  compactModeEnabled.value ? SIDEBAR_WIDTH_COMPACT : SIDEBAR_WIDTH_DEFAULT,
);
const pixelsPerMinute = computed(() =>
  compactModeEnabled.value
    ? PIXELS_PER_MINUTE_COMPACT
    : PIXELS_PER_MINUTE_DEFAULT,
);

/* ========================================================================== */
/* =============================== Utilities ================================ */
/* ========================================================================== */

const px = (n: number) => `${n}px`;
const msToPx = (ms: number) => (ms / T.Min) * pixelsPerMinute.value;

function msBetween(a: MaybeRef<Date | number>, b: MaybeRef<Date | number>) {
  a = unref(a);
  b = unref(b);
  return (
    (b instanceof Date ? b.getTime() : b) -
    (a instanceof Date ? a.getTime() : a)
  );
}

function durationFormatted(durationMs: number): string {
  const hours = Math.floor(durationMs / T.Hour);
  const minutes = Math.floor((durationMs % T.Hour) / T.Min);
  return `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""}`;
}

function clockTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function dayTitle(d: Date) {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

// TODO: Rename it and document.
function dateBoundsMinutes(d: Date, step: number, size: number): [Date, Date] {
  const gridScale = step * T.Min;
  const targetDuration = size * T.Min;

  let leftMs = d.getTime() - Math.round(targetDuration / 2);
  const leftLeftMs = leftMs - (leftMs % gridScale);
  const leftRightMs = leftLeftMs + gridScale;
  leftMs =
    leftMs - leftLeftMs < leftRightMs - leftMs ? leftLeftMs : leftRightMs;
  const rightMs = leftMs + Math.round(targetDuration / gridScale) * gridScale;

  return [new Date(leftMs), new Date(rightMs)];
}

function overlappingDates(...items: Date[]): [Date, Date] {
  items.sort((a, b) => a.getTime() - b.getTime());
  return [items.at(0)!, items.at(-1)!];
}

/* ========================================================================== */
/* ============================= Initialization ============================= */
/* ========================================================================== */

const startDate = new Date();
startDate.setHours(0, 0, 0, 0);
const endDate = new Date(startDate.getTime() + 7 * T.Day);

const timelineStart = shallowRef(startDate);
const timelineEnd = shallowRef(endDate);

const timelineDates = computed(() => {
  const dates = [];
  let date = new Date(timelineStart.value.getTime());
  const end = timelineEnd.value;
  while (date < end) {
    dates.push(date);
    date = new Date(date.getTime() + T.Day);
  }
  return dates;
});

onMounted(() => {
  scrollToNow({
    behavior: "instant",
    position: "left",
    offsetMs: -30 * T.Min,
  });
});

/* ========================================================================== */
/* ============================= Data Fetching ============================== */
/* ========================================================================== */

const actualRooms = shallowRef<Room[]>([]);
const roomsLoading = shallowRef(true);
roomBookingFetch
  .GET("/rooms/")
  .then(({ data }) => {
    if (!data) throw new Error("no data");

    roomsLoading.value = false;
    actualRooms.value = data.map((room, idx) => ({ ...room, idx }));
  })
  .catch((err) => {
    console.error("Failed to load rooms:", err);
    // eslint-disable-next-line no-alert
    alert("Failed to load rooms. Try again later.");
  });

// TODO: remove this, when backend will return booking UIDs.
let bookingIdCounter = 0;

const actualBookings = shallowRef<Map<Booking["id"], Booking>>();
const bookingsLoading = shallowRef(true);
roomBookingFetch
  .GET("/bookings/", {
    params: {
      query: { start: startDate.toISOString(), end: endDate.toISOString() },
    },
  })
  .then(({ data, error }) => {
    if (error?.detail)
      throw new Error(`validation error: ${JSON.stringify(error.detail)}`);

    if (!data) throw new Error("no data");

    const map = new Map<Booking["id"], Booking>();

    for (const booking of data) {
      const mappedBooking = {
        ...booking,
        id: (++bookingIdCounter).toString(),
        startsAt: new Date(booking.start),
        endsAt: new Date(booking.end),
      };

      map.set(mappedBooking.id, mappedBooking);
    }

    bookingsLoading.value = false;
    actualBookings.value = map;
  })
  .catch((err) => {
    console.error("Failed to load bookings:", err);
    // eslint-disable-next-line no-alert
    alert("Failed to load bookings. Try again later.");
  });

const actualBookingsByRoomSorted = computed(() => {
  const map = new Map<Room["id"], Booking[]>();

  for (const booking of actualBookings.value?.values() ?? []) {
    const bookings = map.get(booking.room_id);
    if (bookings) bookings.push(booking);
    else map.set(booking.room_id, [booking]);
  }

  // Need to sort arrays, because later the binary search will be used on them.
  map.forEach((bookings) =>
    bookings.sort(
      // We assume that if booking A starts before any booking B, A also ends
      // before B start.
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    ),
  );

  return map;
});

/* ========================================================================== */
/* ============================= Interactivity ============================== */
/* ========================================================================== */

const now = useNow({ interval: T.Sec });
const nowRulerX = computed(() => px(msToPx(msBetween(timelineStart, now))));

const bookingPositions = computed(() => {
  const start = timelineStart.value;
  const positions = new Map<Booking["id"], BookingPosition>();

  for (const bookings of actualBookingsByRoomSorted.value.values()) {
    let roomLength = 0;
    for (const { id, startsAt, endsAt } of bookings) {
      // Need to do this sort of calculation due to how the bookings
      // are rendered on the timeline: they are rendered one-by-one
      // in a flex container, so the actual position of each booking
      // depends on previous bookings.

      const length = msToPx(msBetween(startsAt, endsAt));
      positions.set(id, {
        offsetX: msToPx(msBetween(start, startsAt)) - roomLength,
        length,
      });
      roomLength += length;
    }
  }

  return positions;
});

/**
 * Returns boolean indicating whether the range intersects any of
 * the room bookings.
 *
 * @param a Start of input range.
 * @param b End of input range.
 * @param roomId ID of the room, which bookings should be checked.
 */
function intersectsSomeBooking(a: Date, b: Date, roomId: string): boolean {
  const aMs = a.getTime();
  const bMs = b.getTime();

  if (aMs >= bMs) throw new Error("invalid range limits");

  const bookings = actualBookingsByRoomSorted.value.get(roomId);
  if (!bookings || bookings.length === 0) return false;

  let l = 0;
  let r = bookings.length - 1;
  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    const mBooking = bookings[m];
    if (mBooking.endsAt.getTime() <= aMs) l = m + 1;
    else if (mBooking.startsAt.getTime() >= bMs) r = m - 1;
    else return true;
  }
  return false;
}

/** Element with unlimited size that holds all elements of the timeline. */
const wrapperEl = ref<HTMLElement | null>(null);

/** Element that limits the size of timeline content and makes it scrollable. */
const scrollerEl = ref<HTMLElement | null>(null);

/** Element that is positioned on the interactive area of the timeline. */
const overlayEl = ref<HTMLElement | null>(null);

// TODO: Rename, refactor and document it.
function pendingBookingSafeRange(booking: {
  room: Room;
  hoveredAt: Date;
  pressedAt?: Date;
}): null | [Date, Date] {
  const { pressedAt, hoveredAt, room } = booking;

  let [l, r] = (() => {
    if (pressedAt) {
      return overlappingDates(
        ...dateBoundsMinutes(
          pressedAt,
          BOOKING_DURATION_STEP,
          MIN_BOOKING_DURATION_MINUTES,
        ),
        ...dateBoundsMinutes(
          hoveredAt,
          BOOKING_DURATION_STEP,
          BOOKING_DURATION_STEP,
        ),
      );
    }
    return dateBoundsMinutes(
      hoveredAt,
      BOOKING_DURATION_STEP,
      MIN_BOOKING_DURATION_MINUTES,
    );
  })();

  if (msBetween(now, r) < 0) return null; // booking is in the past

  const [, safeL] = dateBoundsMinutes(now.value, 5, 5);
  safeL.setMinutes(safeL.getMinutes() + 5);

  if (msBetween(safeL, l) < 0) {
    // Booking start is too close to `now`.
    if (msBetween(safeL, r) < MIN_BOOKING_DURATION_MINUTES * T.Min)
      // Booking end is also too close to `now`.
      return null;

    l = safeL;
  }

  if (intersectsSomeBooking(l, r, room.id)) return null;

  return [l, r];
}

function clientCoordinatesWithinOverlay(x0: number, y0: number): boolean {
  const rect = overlayEl.value?.getBoundingClientRect();
  if (!rect) return false;

  const { x, y, width: w, height: h } = rect;

  return x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h;
}

function positionByClientCoordinates(x: number, y: number): Position | null {
  const rect = wrapperEl.value?.getBoundingClientRect();

  if (!rect) return null;

  const { x: cornerX, y: cornerY } = rect;
  x -= cornerX + sidebarWidth.value;
  y -= cornerY + HEADER_HEIGHT;

  const roomIdx = Math.floor(y / ROW_HEIGHT);
  const room = actualRooms.value[roomIdx];
  if (!room) return null;

  const date = new Date(
    timelineStart.value.getTime() + (x / pixelsPerMinute.value) * T.Min,
  );

  return { room, date };
}

type InteractionState =
  | {
      /** User didn't start to interact with the timeline. */
      type: "idle";
    }
  | {
      /** User is hovering mouse over the timeline. */
      type: "mouse-hovering";
      hoverAt: Position;
    }
  | {
      /** User pressed on the timeline with the mouse and is dragging it. */
      type: "mouse-dragging";
      clickAt: Position;
      dragAt: Position;
    }
  | {
      /**
       * User intended to create a new booking using the touchscreen, but isn't
       * touching it currently.
       */
      type: "touch-inactive";
      slot: Slot;
    }
  | {
      /** User is dragging the edge of a new booking to adjust its' time. */
      type: "touch-dragging-edge";
      slot: Slot;
      edge: "left" | "right";
      touchId: number;
    };

type InteractionState_<S extends InteractionState["type"]> = Extract<
  InteractionState,
  { type: S }
>;

const interactionState = shallowRef<InteractionState>({ type: "idle" });

// FIXME: Hack to distinguish mouse events from touch events.
let lastTouchTimeStamp = -100000000;
const isTouchEvent = (e: Event) =>
  Math.abs(lastTouchTimeStamp - e.timeStamp) < T.Sec;

const stateListenerTransitionMap: {
  [S in InteractionState["type"]]: {
    [E in keyof HTMLElementEventMap]?: (
      event: HTMLElementEventMap[E],
      currentState: InteractionState_<S>,
    ) => InteractionState | null;
  };
} = {
  idle: {
    touchstart: (event) => {
      lastTouchTimeStamp = event.timeStamp;
      return null;
    },
    mousemove: transition1_mousemove,
    mousedown: transition2_mousedown,
  },
  "mouse-hovering": {
    mousemove: transition1_mousemove,
    mousedown: transition2_mousedown,
    mouseleave: transition3_mouseleave,
  },
  "mouse-dragging": {
    mousemove: transition4_mousemove,
    mouseleave: transition3_mouseleave,
    mouseup: transition5_mouseup,
  },
  "touch-inactive": {
    touchstart: (event, state) => {
      const [touch] = event.changedTouches; // Ignore other touches.
      const { clientX: x0, clientY: y0 } = touch;

      if (!clientCoordinatesWithinOverlay(x0, y0)) return null;

      const boxRect = document
        .getElementById(NEW_BOOKING_BOX_ID)
        ?.getBoundingClientRect();
      if (!boxRect) return null;

      const touchedEdge = (() => {
        const { x, y, width, height } = boxRect;

        if (!(y - 6 <= y0 && y0 <= y + height + 6))
          // Vertical hit.
          return null;

        const distToLeft = Math.abs(x0 - x);
        const distToRight = Math.abs(x0 - (x + width));

        if (distToLeft < distToRight && distToLeft < 12) return "left";
        if (distToRight < distToLeft && distToRight < 12) return "right";

        return null;
      })();

      if (touchedEdge === null) return null;

      event.preventDefault();

      return {
        type: "touch-dragging-edge",
        slot: state.slot,
        edge: touchedEdge,
        touchId: touch.identifier,
      };
    },
  },
  "touch-dragging-edge": {
    touchmove: (event, state) => {
      const touch = Array.from(event.changedTouches).find(
        ({ identifier }) => identifier === state.touchId,
      );
      if (!touch) return null;

      event.preventDefault();

      const { clientX, clientY } = touch;

      if (!clientCoordinatesWithinOverlay(clientX, clientY)) return null;

      const pos = positionByClientCoordinates(clientX, clientY);
      if (!pos) return null;

      // TODO: calculate it in a better way.
      const newSlot = (() => {
        switch (state.edge) {
          case "left": {
            const range = pendingBookingSafeRange({
              room: state.slot.room,
              pressedAt: state.slot.end,
              hoveredAt: pos.date,
            });
            if (!range) return null;
            return {
              room: state.slot.room,
              start: range[0],
              end: state.slot.end,
            };
          }
          case "right": {
            const range = pendingBookingSafeRange({
              room: state.slot.room,
              pressedAt: state.slot.start,
              hoveredAt: pos.date,
            });
            if (!range) return null;
            return {
              room: state.slot.room,
              start: state.slot.start,
              end: range[1],
            };
          }
        }
      })();

      if (!newSlot) return null;

      return {
        ...state,
        slot: newSlot,
      };
    },
    touchend: transition6_touchend,
    touchcancel: transition6_touchend,
  },
};

function transition1_mousemove(event: MouseEvent): InteractionState | null {
  if (isTouchEvent(event)) return null;

  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(clientX, clientY))
    return { type: "idle" };

  const pos = positionByClientCoordinates(clientX, clientY);
  if (!pos) return { type: "idle" };

  return {
    type: "mouse-hovering",
    hoverAt: pos,
  };
}

function transition2_mousedown(
  event: MouseEvent,
  state: InteractionState,
): InteractionState | null {
  if (isTouchEvent(event) && state.type !== "idle") return null;

  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(clientX, clientY))
    return { type: "idle" };

  const pos = positionByClientCoordinates(clientX, clientY);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  if (isTouchEvent(event)) {
    const range = pendingBookingSafeRange({
      room: pos.room,
      hoveredAt: pos.date,
    });

    if (!range) return null;

    return {
      type: "touch-inactive",
      slot: {
        room: pos.room,
        start: range[0],
        end: range[1],
      },
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
  event: MouseEvent,
  state: InteractionState_<"mouse-dragging">,
): InteractionState {
  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(clientX, clientY))
    return { type: "idle" };

  const pos = positionByClientCoordinates(clientX, clientY);
  if (!pos) return { type: "idle" };

  event.preventDefault();
  event.stopImmediatePropagation();

  return {
    type: "mouse-dragging",
    clickAt: state.clickAt,
    dragAt: pos,
  };
}

function transition5_mouseup(
  event: MouseEvent,
  state: InteractionState_<"mouse-dragging">,
): InteractionState {
  const { clientX, clientY } = event;

  if (!clientCoordinatesWithinOverlay(clientX, clientY))
    return { type: "idle" };

  const range = pendingBookingSafeRange({
    room: state.clickAt.room,
    pressedAt: state.clickAt.date,
    hoveredAt: state.dragAt.date,
  });

  if (!range) return { type: "idle" };

  emit("book", {
    room: state.clickAt.room,
    start: range[0],
    end: range[1],
  });

  return { type: "idle" };
}

function transition6_touchend(
  event: TouchEvent,
  state: InteractionState_<"touch-dragging-edge">,
): InteractionState | null {
  const touch = Array.from(event.changedTouches).find(
    ({ identifier }) => identifier === state.touchId,
  );
  if (!touch) return null;

  event.preventDefault();

  return {
    type: "touch-inactive",
    slot: state.slot,
  };
}

function handleBoookingCancel() {
  interactionState.value = { type: "idle" };
}

function handleBoookingConfirm() {
  switch (interactionState.value.type) {
    case "idle":
    case "mouse-hovering":
    case "mouse-dragging":
      return;
    case "touch-inactive":
    case "touch-dragging-edge":
      emit("book", interactionState.value.slot);
      interactionState.value = { type: "idle" };
      break;
    default:
      interactionState.value satisfies never;
  }
}

watch(
  [() => interactionState.value.type, wrapperEl],
  ([newState, el], _, onCleanup) => {
    if (!el) return;

    const [, eventsMap] = Object.entries(stateListenerTransitionMap).find(
      ([state]) => state === newState,
    )!;

    const cleanupFns = Object.entries(eventsMap).map(
      ([eventName, listener]) => {
        const listenerWrapped = (event: any) => {
          const newState = listener(event, interactionState.value);
          if (newState != null) interactionState.value = newState;
        };
        el.addEventListener(eventName, listenerWrapped);
        return () => el.removeEventListener(eventName, listenerWrapped);
      },
    );

    onCleanup(() => {
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error("Failed to execute cleanup function:", err);
        }
      });
    });
  },
  { immediate: true, flush: "post" },
);

const newBookingTouched = computed(() => {
  switch (interactionState.value.type) {
    case "idle":
    case "mouse-hovering":
    case "mouse-dragging":
      return false;
    case "touch-inactive":
    case "touch-dragging-edge":
      return true;
    default:
      return interactionState.value satisfies never;
  }
});

const newBookingSlot = computed<Slot | null>(() => {
  const state = interactionState.value;
  switch (state.type) {
    case "idle":
      return null;
    case "mouse-hovering": {
      const range = pendingBookingSafeRange({
        room: state.hoverAt.room,
        hoveredAt: state.hoverAt.date,
      });

      if (!range) return null;

      return {
        room: state.hoverAt.room,
        start: range[0],
        end: range[1],
      };
    }
    case "mouse-dragging": {
      const range = pendingBookingSafeRange({
        room: state.clickAt.room,
        pressedAt: state.clickAt.date,
        hoveredAt: state.dragAt.date,
      });

      if (!range) return null;

      return {
        room: state.clickAt.room,
        start: range[0],
        end: range[1],
      };
    }
    case "touch-inactive":
      return state.slot;
    case "touch-dragging-edge":
      return state.slot;
    default:
      return state satisfies never;
  }
});

const newBookingData = computed(() => {
  const slot = newBookingSlot.value;

  if (!slot) return null;

  return {
    duration: msBetween(slot.start, slot.end),
    x: msToPx(msBetween(timelineStart, slot.start)),
    y: slot.room.idx * ROW_HEIGHT,
  };
});

function handleBookingClick(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    const bookingId = event.currentTarget.dataset.bookingId;
    if (bookingId) {
      const booking = actualBookings.value?.get(bookingId);
      if (booking) emit("bookingClick", booking);
      else console.warn(`Click on undefined booking with ID "${bookingId}".`);
    }
  }
}

/* ========================================================================== */
/* =============================== Scrolling ================================ */
/* ========================================================================== */

type ScrollToOptions = {
  /** Date to scroll to. */
  to: Date;
  /** Behavior of scroll. */
  behavior?: "smooth" | "instant";
  /** Position where the target date should be aligned. */
  position?: "left" | "center" | "right";
  /** Offset to shift the target position by. */
  offsetMs?: number;
};

function scrollTo(options: ScrollToOptions) {
  const el = scrollerEl.value;

  if (!el) return;

  const {
    to,
    behavior = "smooth",
    position = "center",
    offsetMs = 0,
  } = options;

  const { width } = el.getBoundingClientRect();
  const toLeftPx = msToPx(msBetween(timelineStart, to));

  const scrollLeftPx = (() => {
    switch (position) {
      case "left":
        return toLeftPx;
      case "center":
        return toLeftPx - (width - sidebarWidth.value) / 2;
      case "right":
        return toLeftPx - (width - sidebarWidth.value) + 1;
    }
  })();

  el.scrollTo({
    behavior,
    left: scrollLeftPx + msToPx(offsetMs),
  });
}

function scrollToNow(options?: Omit<ScrollToOptions, "to">) {
  scrollTo({
    ...options,
    to: now.value,
  });
}
</script>

<template>
  <div :class="$style.root">
    <div
      :class="$style.timeline"
      :style="{
        '--sidebar-width': px(sidebarWidth),
        '--header-height': px(HEADER_HEIGHT),
        '--row-height': px(ROW_HEIGHT),
        '--ppm': pixelsPerMinute,
        '--now-x': nowRulerX,
        ...(newBookingData && {
          cursor: 'crosshair',
          '--new-x': px(newBookingData.x),
          '--new-y': px(newBookingData.y),
          '--new-length': px(msToPx(newBookingData.duration)),
        }),
      }"
      :data-new-pressed="
        interactionState.type === 'mouse-dragging' || newBookingTouched
          ? ''
          : null
      "
      :data-new-touched="newBookingTouched ? '' : null"
    >
      <div :class="$style.corner">
        <h2 v-show="!compactModeEnabled">Timeline</h2>
      </div>

      <div ref="scrollerEl" :class="$style.scroller">
        <div ref="wrapperEl" :class="$style.wrapper">
          <span :class="$style['now-ruler']" />
          <div :class="$style['now-timebox-wrapper']">
            <span
              :class="$style['now-timebox']"
              @click="scrollToNow({ position: 'center' })"
            >
              {{ clockTime(now) }}
            </span>
          </div>

          <template v-if="newBookingSlot">
            <span :class="$style['new-booking-ruler-start']" />
            <span :class="$style['new-booking-ruler-end']" />
            <div :class="$style['new-booking-timeboxes-wrapper']">
              <div :class="$style['new-booking-timeboxes-container']">
                <span :class="$style['new-booking-timebox-start']">
                  {{ clockTime(newBookingSlot.start) }}
                </span>
                <span :class="$style['new-booking-timebox-end']">
                  {{ clockTime(newBookingSlot.end) }}
                </span>
              </div>
            </div>
          </template>

          <svg :class="$style['rulers-svg']" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="Rulers"
                x="0"
                y="0"
                :width="pixelsPerMinute * 60"
                height="100%"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" height="100%" width="1" />
                <rect
                  :x="pixelsPerMinute * 15"
                  y="0"
                  height="100%"
                  width="1"
                  opacity="0.4"
                />
                <rect
                  :x="pixelsPerMinute * 30"
                  y="0"
                  height="100%"
                  width="1"
                  opacity="0.7"
                />
                <rect
                  :x="pixelsPerMinute * 45"
                  y="0"
                  height="100%"
                  width="1"
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect fill="url(#Rulers)" width="100%" height="100%" />
          </svg>

          <div v-if="newBookingData" :class="$style['new-booking']">
            <div :id="NEW_BOOKING_BOX_ID">
              <span>{{ durationFormatted(newBookingData.duration) }}</span>
            </div>
          </div>

          <div :class="$style.header">
            <div
              v-for="day in timelineDates"
              :key="day.toString()"
              :class="$style['header-item']"
            >
              <span :class="$style['header-item-day']">
                {{ dayTitle(day) }}
              </span>
              <div :class="$style['header-item-hours']">
                <span v-for="h in HOURS_TIMES" :key="h">
                  <span>{{ h }}</span>
                </span>
              </div>
            </div>
          </div>

          <div :class="$style.body">
            <div
              v-for="(room, i) in roomsLoading
                ? PLACEHOLDER_ROOMS
                : actualRooms"
              :key="room === 'placeholder' ? i : room.id"
              :class="$style.row"
            >
              <div
                :class="{
                  [$style['row-header']]: true,
                  [$style.placeholder]: room === 'placeholder',
                }"
              >
                <span>
                  {{
                    room === "placeholder"
                      ? "xxx"
                      : compactModeEnabled
                        ? room.short_name
                        : room.title
                  }}
                </span>
              </div>

              <div
                v-for="(booking, j) in room === 'placeholder' || bookingsLoading
                  ? PLACEHOLDER_BOOKINGS
                  : actualBookingsByRoomSorted.get(room.id)?.values()"
                :key="booking === 'placeholder' ? j : booking.id"
                :class="{
                  [$style.booking]: true,
                  [$style.placeholder]: booking === 'placeholder',
                }"
                :style="
                  booking === 'placeholder'
                    ? {}
                    : {
                        '--left': px(
                          bookingPositions.get(booking.id)?.offsetX ?? 0,
                        ),
                        '--width': px(
                          bookingPositions.get(booking.id)?.length ?? 0,
                        ),
                      }
                "
              >
                <div v-if="booking === 'placeholder'">
                  <span>PLACEHOLDER</span>
                </div>
                <div
                  v-else
                  :title="booking.title"
                  :data-booking-id="booking.id"
                  @click="handleBookingClick"
                >
                  <span>
                    {{ booking.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref="overlayEl" :class="$style.overlay" />
    </div>

    <div v-if="newBookingTouched" :class="$style.buttons">
      <button :class="$style['button-secondary']" @click="handleBoookingCancel">
        Cancel
      </button>
      <button :class="$style['button-primary']" @click="handleBoookingConfirm">
        Book
      </button>
    </div>
  </div>
</template>

<style module lang="scss">
@use "./styles/_colors.scss" as colors;
@use "./styles/_effects.scss" as effects;
@use "./styles/_borders.scss" as borders;

/* TODO: extract text mixins to _typography.scss */
/* TODO: systemize spacing (padding, margin, etc.) and use variables instead */

$timebox-width: 50px;
$timebox-height: 20px;
$button-height: 50px;

@mixin text-sm {
  font-size: 0.875rem;
  line-height: 1.0625rem;
}
@mixin text-md {
  font-size: 1rem;
  line-height: 1.3125rem;
}

@mixin booking {
  padding: 6px 2px;
  user-select: none;
  white-space: nowrap;

  & > div {
    @include effects.shadow-1;

    width: 100%;
    height: 100%;
    padding: 0 6px 0 12px;
    display: flex;
    align-items: center;
    border-radius: borders.$radius-sm;
  }
}

@mixin timebox(
  $text-color,
  $bg-color: transparent,
  $border-color: transparent
) {
  @include text-sm;
  width: $timebox-width;
  height: $timebox-height;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  color: $text-color;
  background: $bg-color;
  border: 1px solid $border-color;
  border-radius: borders.$radius-xs;
}

@mixin skeleton {
  background: var(--c-skeleton-bg);
  color: transparent;
  border-radius: borders.$radius-md;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

.root {
  --c-bg-items: #{colors.$gray-50};
  --c-bg-sheet: #{colors.$gray-100};
  --c-borders: #{colors.$gray-200};
  --c-text: #{colors.$gray-900};
  --c-text-muted: #{colors.$gray-500};
  --c-text-muted-2: #{colors.$gray-300};
  --c-textbox-bg-red: #{colors.$red-400};
  --c-textbox-text-red: #{colors.$red-900};
  --c-textbox-borders-red: #{colors.$red-600};
  --c-textbox-bg-purple: #{colors.$purple-400};
  --c-textbox-text-purple: #{colors.$purple-900};
  --c-textbox-borders-purple: #{colors.$purple-600};
  --c-ruler-now: #{colors.$red-600};
  --c-ruler-new: #{colors.$purple-600};
  --c-skeleton-bg: #{colors.$gray-300};
}

:global(.dark) {
  .root {
    --c-bg-items: #{colors.$gray-950};
    --c-bg-sheet: #{colors.$gray-900};
    --c-borders: #{colors.$gray-800};
    --c-text: #{colors.$gray-200};
    --c-text-muted: #{colors.$gray-500};
    --c-text-muted-2: #{colors.$gray-700};
    --c-textbox-bg-red: #{colors.$red-900};
    --c-textbox-text-red: #{colors.$red-500};
    --c-textbox-borders-red: #{colors.$red-700};
    --c-textbox-bg-purple: #{colors.$purple-900};
    --c-textbox-text-purple: #{colors.$purple-500};
    --c-textbox-borders-purple: #{colors.$purple-700};
    --c-ruler-now: #{colors.$red-800};
    --c-ruler-new: #{colors.$purple-800};
    --c-skeleton-bg: #{colors.$gray-800};
  }
}

.root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.timeline {
  position: relative;
  overflow: hidden;
  background: var(--c-bg-sheet);
  border: 1px solid var(--c-borders);
  border-radius: borders.$radius-md;
}

.corner {
  @include text-md;

  position: absolute;
  top: 0;
  z-index: 5;
  width: var(--sidebar-width);
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding-left: 12px;
  background: var(--c-bg-items);
  color: var(--c-text);

  border-color: var(--c-borders);
  border-style: solid;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.overlay {
  @include effects.shadow-inset-2;

  position: absolute;
  left: var(--sidebar-width);
  top: var(--header-height);
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.scroller {
  position: relative;
  overflow: auto;
  overscroll-behavior: none;
  scrollbar-width: none;
  max-height: 100%;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.wrapper {
  display: flex;
  flex-direction: column;
  width: fit-content;
  position: relative;

  background-image: var(--rulers-bg);
  background-position-x: var(--sidebar-width);
  background-repeat: repeat;
}

.header {
  @include text-md;

  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  width: fit-content;
  height: var(--header-height);
  margin-left: var(--sidebar-width);
  border-bottom: 1px solid var(--c-borders);

  background: var(--c-bg-items);
  color: var(--c-text-muted);

  &-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &-day {
      padding-left: 12px;
      padding-top: 6px;
      align-self: flex-start;
      position: sticky;
      left: var(--sidebar-width);
    }

    &-hours {
      display: flex;
      align-items: center;

      & > span {
        width: calc(var(--ppm) * 60px);

        & > span {
          @include timebox(var(--c-text-muted-2));
          transform: translate(
            -50%,
            1px
          ); // 1px down to align with dynamic timeboxes.
        }
      }
    }
  }
}

.body {
  @include text-md;
  display: flex;
  flex-direction: column;
}

.row {
  height: var(--row-height);
  display: flex;
  align-items: stretch;

  &:not(:last-child) {
    .row-header {
      border-bottom-width: 1px;
    }
  }

  &.placeholder::after {
    position: absolute;
    inset: 0;
    background: pink;
  }
}

.row-header {
  position: sticky;
  left: 0;
  z-index: 1;
  width: var(--sidebar-width);
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--c-bg-items);
  color: var(--c-text-muted);

  border-color: var(--c-borders);
  border-style: solid;
  border-right-width: 1px;

  & > span {
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  &.placeholder {
    & > span {
      @include skeleton;
      width: 100%;
    }
  }
}

.rulers-svg {
  display: block;
  position: absolute;
  top: 0;
  left: var(--sidebar-width);
  width: 100%;
  height: 100%;

  & pattern rect {
    fill: var(--c-borders);
  }
}

.now-timebox-wrapper {
  position: sticky;
  top: 0;
  height: 0;
  z-index: 4;
  display: flex;
  align-items: flex-end;
  overflow: visible;

  &::before,
  &::after {
    content: "";
    display: block;
  }

  &::before {
    flex: 0 0 calc(var(--now-x) + var(--sidebar-width) - ($timebox-width / 2));
  }

  &::after {
    flex-grow: 1;
  }
}

.now-timebox {
  @include timebox(
    var(--c-textbox-text-red),
    var(--c-textbox-bg-red),
    var(--c-textbox-borders-red)
  );
  position: sticky;
  right: 0;
  left: var(--sidebar-width);
  transform: translateY(var(--header-height));
  cursor: pointer;
}

.now-ruler {
  z-index: 1;
  position: absolute;
  height: 100%;
  width: 1px;
  background: var(--c-ruler-now);
  left: calc(var(--sidebar-width) + var(--now-x));
  top: 0;
}

.booking {
  @include booking;

  position: relative;
  left: var(--left);
  width: var(--width);

  & > div {
    background: var(--c-bg-items);
    color: var(--c-text);

    :global(.dark) & {
      border: 1px solid var(--c-borders);
    }
  }

  &:not(.placeholder) > div {
    cursor: pointer;

    & > span {
      position: sticky;
      left: var(--sidebar-width);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &.placeholder {
    flex: 1 0 auto;

    & > div {
      padding: 8px;

      & > span {
        @include skeleton;
        position: relative;
        width: 100%;
      }
    }
  }
}

.new-booking {
  @include booking;

  z-index: 1;
  position: absolute;
  left: calc(var(--sidebar-width) + var(--new-x));
  top: calc(var(--header-height) + var(--new-y));
  width: var(--new-length);
  height: var(--row-height);

  & > div {
    position: relative;
    padding: 0;
    justify-content: center;
    border: 1px solid var(--c-textbox-borders-purple);
    background: var(--c-textbox-bg-purple);
    color: var(--c-textbox-text-purple);
  }
}

.timeline[data-new-touched] .new-booking > div {
  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 5px;
    height: 80%;
    top: 50%;
    border-radius: 100px;
    background: var(--c-textbox-borders-purple);
  }

  &::before {
    left: 0;
    transform: translate(-50%, -50%);
  }
  &::after {
    right: 0;
    transform: translate(50%, -50%);
  }
}

.new-booking-timeboxes-wrapper {
  position: sticky;
  top: 0;
  height: 0;
  z-index: 4;
  overflow: visible;
}

.new-booking-timeboxes-container {
  position: absolute;
  left: calc(var(--sidebar-width) + var(--new-x) + (var(--new-length) / 2));
  top: var(--header-height);
  width: calc(max($timebox-width, var(--new-length)) + $timebox-width);
  transform: translate(-50%, -100%);

  display: flex;
  align-items: center;
  justify-content: center;
}

.new-booking-timebox-start,
.new-booking-timebox-end {
  @include timebox(
    var(--c-textbox-text-purple),
    var(--c-textbox-bg-purple),
    var(--c-textbox-borders-purple)
  );
  flex: 0 0 auto;
}
.new-booking-timebox-start {
  margin-right: auto;
}
.new-booking-timebox-end {
  margin-left: auto;
}

.new-booking-ruler-start,
.new-booking-ruler-end {
  position: absolute;
  top: 0;
  z-index: 1;
  height: 100%;
  width: 1px;
  background: var(--c-ruler-new);
}
.new-booking-ruler-start {
  left: calc(var(--sidebar-width) + var(--new-x));
}
.new-booking-ruler-end {
  left: calc(var(--sidebar-width) + var(--new-x) + var(--new-length));
}

.timeline:not([data-new-pressed]) .new-booking-ruler-end,
.timeline:not([data-new-pressed]) .new-booking-timebox-end {
  visibility: hidden;
}

.buttons {
  display: flex;
  gap: 8px;

  & button {
    @include text-md();
    @include effects.shadow-2();
    height: $button-height;
    flex: 1 0 auto;
    border-radius: borders.$radius-md;
  }

  & .button-secondary {
    color: var(--c-text-muted);
    background: var(--c-bg-items);
    border: 1px solid var(--c-borders);
  }

  & .button-primary {
    color: var(--c-textbox-text-purple);
    background: var(--c-textbox-bg-purple);
    border: 1px solid var(--c-textbox-borders-purple);
  }
}
</style>
