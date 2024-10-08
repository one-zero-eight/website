<script setup lang="ts">
import { roomBookingFetch, type roomBookingTypes } from "@/api/room-booking";
import { useEventListener, useMediaQuery, useNow } from "@vueuse/core";
import type { MaybeRef } from "vue";
import { computed, onMounted, ref, shallowRef, toRaw, unref } from "vue";

export interface NewBooking {
  from: Date;
  to: Date;
  room: roomBookingTypes.SchemaRoom;
}
export type Booking = Omit<roomBookingTypes.SchemaBooking, "start" | "end"> & {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

const emit = defineEmits<{
  book: [newBooking: NewBooking];
  bookingClick: [booking: Booking];
}>();

const PLACEHOLDER_ROOMS = Array.from({ length: 15 }).fill(
  "placeholder",
) as "placeholder"[];

const PLACEHOLDER_BOOKINGS = Array.from({ length: 10 }).fill(
  "placeholder",
) as "placeholder"[];

const T = {
  Ms: 1,
  Sec: 1000,
  Min: 1000 * 60,
  Hour: 1000 * 60 * 60,
  Day: 1000 * 60 * 60 * 24,
};

onMounted(() => {
  scrollToNow({
    behavior: "instant",
    position: "left",
    offsetMs: -30 * T.Min,
  });
});

const PIXELS_PER_MINUTE = 100 / 30;
const MIN_BOOKING_DURATION_MINUTES = 15;
const BOOKING_DURATION_STEP = 5;

const DESKTOP_SIDEBAR_WIDTH = 200;
const MOBILE_SIDEBAR_WIDTH = 70;
const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 50;

const isMobile = useMediaQuery("(max-width: 768px)");
const sidebarWidth = computed(() =>
  isMobile.value ? MOBILE_SIDEBAR_WIDTH : DESKTOP_SIDEBAR_WIDTH,
);
const sidebarWidthPx = computed(() => px(sidebarWidth.value));

const msToPx = (ms: number) => (ms / T.Min) * PIXELS_PER_MINUTE;
const px = (n: number) => `${n}px`;

interface BookingPosition {
  offsetX: number;
  length: number;
}

function msBetween(a: MaybeRef<Date | number>, b: MaybeRef<Date | number>) {
  a = unref(a);
  b = unref(b);
  return (
    (b instanceof Date ? b.getTime() : b) -
    (a instanceof Date ? a.getTime() : a)
  );
}

function dateBoundsMinutes(d: Date, step: number, size: number): [Date, Date] {
  const l = new Date(d);
  l.setMinutes(0, 0, 0);

  // Find the nearest point before `d` that is divisible by step.
  while (l.getTime() + step * T.Min < d.getTime()) {
    l.setMinutes(l.getMinutes() + step);
  }

  // Go back until `d` is after the middle.
  while (l.getTime() + (size * T.Min) / 2 - step * T.Min > d.getTime()) {
    l.setMinutes(l.getMinutes() - step);
  }

  const r = new Date(l.getTime() + size * T.Min);

  return [l, r];
}

function overlappingDates(...items: Date[]): [Date, Date] {
  items.sort((a, b) => a.getTime() - b.getTime());
  return [items.at(0)!, items.at(-1)!];
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

const startDate = new Date();
startDate.setHours(0, 0, 0, 0);
const endDate = new Date(startDate.getTime() + 7 * T.Day);

const actualRooms = shallowRef<roomBookingTypes.SchemaRoom[]>([]);
const roomsLoading = shallowRef(true);
roomBookingFetch
  .GET("/rooms/")
  .then(({ data }) => {
    if (!data) throw new Error("no data");

    roomsLoading.value = false;
    actualRooms.value = data;
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
  const map = new Map<roomBookingTypes.SchemaRoom["id"], Booking[]>();

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

const HOURS_TIMES = Array.from({ length: 24 })
  .fill(null)
  .map((_, h) => `${h.toString().padStart(2, "0")}:00`);

const timelineStart = shallowRef(startDate);
const timelineEnd = shallowRef(endDate);

const now = useNow({ interval: T.Sec });
const nowRulerX = computed(() => px(msToPx(msBetween(timelineStart, now))));

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

const scrollerEl = ref<HTMLElement | null>(null);
const wrapperEl = ref<HTMLElement | null>(null);
const overlayEl = ref<HTMLElement | null>(null);

interface PendingBooking {
  roomIdx: number;
  room: roomBookingTypes.SchemaRoom;
  pressedAt?: Date;
  hoveredAt: Date;
}

function pendingBookingSafeRange(booking: PendingBooking): null | [Date, Date] {
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

const pendingBooking = ref<PendingBooking | null>(null);
const pendingBookingData = computed(() => {
  if (!pendingBooking.value) return null;

  const safeRange = pendingBookingSafeRange(pendingBooking.value);
  if (!safeRange) return null;

  const [l, r] = safeRange;

  return {
    start: l,
    end: r,
    duration: msBetween(l, r),
    x: msToPx(msBetween(timelineStart, l)),
    y: pendingBooking.value.roomIdx * ROW_HEIGHT,
  };
});

function eventWithinOverlay(event: MouseEvent) {
  const rect = overlayEl.value?.getBoundingClientRect();
  if (!rect) return false;

  const { x, y, width: w, height: h } = rect;
  const { clientX: x0, clientY: y0 } = event;

  return x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h;
}

function slotByClientCoordinates(x: number, y: number) {
  const rect = wrapperEl.value?.getBoundingClientRect();

  if (!rect) return null;

  const { x: cornerX, y: cornerY } = rect;
  x -= cornerX + sidebarWidth.value;
  y -= cornerY + HEADER_HEIGHT;

  const roomIdx = Math.floor(y / ROW_HEIGHT);
  const room = actualRooms.value[roomIdx];
  if (!room) return null;

  const date = new Date(
    timelineStart.value.getTime() + (x / PIXELS_PER_MINUTE) * T.Min,
  );

  return { room, roomIdx, date };
}

useEventListener(wrapperEl, "mousemove", (event) => {
  if (!eventWithinOverlay(event)) {
    pendingBooking.value = null;
    return;
  }

  const slot = slotByClientCoordinates(event.clientX, event.clientY);
  if (!slot) {
    pendingBooking.value = null;
    return;
  }

  if (pendingBooking.value?.pressedAt) {
    pendingBooking.value.hoveredAt = slot.date;
  } else {
    pendingBooking.value = {
      roomIdx: slot.roomIdx,
      room: slot.room,
      hoveredAt: slot.date,
    };
  }
});
useEventListener(wrapperEl, "mousedown", (event) => {
  if (!eventWithinOverlay(event)) {
    pendingBooking.value = null;
    return;
  }

  const slot = slotByClientCoordinates(event.clientX, event.clientY);
  if (!slot) {
    pendingBooking.value = null;
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  pendingBooking.value = {
    roomIdx: slot.roomIdx,
    room: slot.room,
    hoveredAt: slot.date,
    pressedAt: slot.date,
  };
});
useEventListener(wrapperEl, "mouseup", (event) => {
  if (!pendingBooking.value?.pressedAt) {
    pendingBooking.value = null;
    return;
  }

  if (!eventWithinOverlay(event)) {
    pendingBooking.value = null;
    return;
  }

  const safeRange = pendingBookingSafeRange(pendingBooking.value);
  if (!safeRange) {
    pendingBooking.value = null;
    return;
  }

  emit("book", {
    from: safeRange[0],
    to: safeRange[1],
    room: toRaw(pendingBooking.value.room),
  });

  pendingBooking.value = null;
});
useEventListener(wrapperEl, "mouseleave", () => {
  pendingBooking.value = null;
});

interface ScrollToOptions {
  /** Date to scroll to. */
  to: Date;
  /** Behavior of scroll. */
  behavior?: "smooth" | "instant";
  /** Position where the target date should be aligned. */
  position?: "left" | "center" | "right";
  /** Offset to shift the target position by. */
  offsetMs?: number;
}

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

function handleBookingClick(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    const bookingId = event.currentTarget.dataset.bookingId;
    if (bookingId) {
      const booking = actualBookings.value?.get(bookingId);
      if (booking) emit("bookingClick", booking);
      else console.warn(`undefined booking clicked (ID=${bookingId})`);
    }
  }
}
</script>

<template>
  <div
    :class="$style.timeline"
    :style="{
      '--sidebar-width': sidebarWidthPx,
      '--header-height': px(HEADER_HEIGHT),
      '--row-height': px(ROW_HEIGHT),
      '--ppm': PIXELS_PER_MINUTE,
      '--now-x': nowRulerX,
      ...(pendingBookingData && {
        cursor: 'crosshair',
        '--new-x': px(pendingBookingData.x),
        '--new-y': px(pendingBookingData.y),
        '--new-length': px(msToPx(pendingBookingData.duration)),
      }),
    }"
    :data-new-pressed="
      pendingBookingData && pendingBooking?.pressedAt ? '' : null
    "
  >
    <div :class="$style.corner">
      <h2 v-if="!isMobile">Timeline</h2>
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

        <template v-if="pendingBookingData">
          <span :class="$style['new-booking-ruler-start']" />
          <span :class="$style['new-booking-ruler-end']" />
          <div :class="$style['new-booking-timeboxes-wrapper']">
            <div :class="$style['new-booking-timeboxes-container']">
              <span :class="$style['new-booking-timebox-start']">
                {{ clockTime(pendingBookingData.start) }}
              </span>
              <span :class="$style['new-booking-timebox-end']">
                {{ clockTime(pendingBookingData.end) }}
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
              :width="PIXELS_PER_MINUTE * 60"
              height="100%"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" height="100%" width="1" />
              <rect
                :x="PIXELS_PER_MINUTE * 15"
                y="0"
                height="100%"
                width="1"
                opacity="0.4"
              />
              <rect
                :x="PIXELS_PER_MINUTE * 30"
                y="0"
                height="100%"
                width="1"
                opacity="0.7"
              />
              <rect
                :x="PIXELS_PER_MINUTE * 45"
                y="0"
                height="100%"
                width="1"
                opacity="0.4"
              />
            </pattern>
          </defs>
          <rect fill="url(#Rulers)" width="100%" height="100%" />
        </svg>

        <div v-if="pendingBookingData" :class="$style['new-booking']">
          <div>
            <span>{{ durationFormatted(pendingBookingData.duration) }}</span>
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
            v-for="(room, i) in roomsLoading ? PLACEHOLDER_ROOMS : actualRooms"
            :key="room === 'placeholder' ? i : room.id"
            :class="$style.row"
          >
            <div
              :class="{
                [$style['row-header']]: true,
                [$style.placeholder]: room === 'placeholder',
              }"
            >
              <span v-if="isMobile" style="width: 100%; text-align: center">
                {{ room === "placeholder" ? "PLA" : room.short_name }}
              </span>
              <span v-else>
                {{ room === "placeholder" ? "PLACEHOLDER" : room.title }}
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
</template>

<style module lang="scss">
@use "./styles/_colors.scss" as colors;
@use "./styles/_effects.scss" as effects;
@use "./styles/_borders.scss" as borders;

/* TODO: extract text mixins to _typography.scss */
/* TODO: systemize spacing (padding, margin, etc.) and use variables instead */

$timebox-width: 50px;
$timebox-height: 20px;

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

@mixin timebox {
  @include text-sm;
  width: $timebox-width;
  height: $timebox-height;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--c-text-muted-2);
  user-select: none;
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

.timeline {
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
  .timeline {
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

.timeline {
  position: relative;
  overflow: hidden;
  background: var(--c-bg-sheet);
  border: 1px solid var(--c-borders);
  border-radius: borders.$radius-md;
  display: flex;
  max-height: 100%;
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
  overscroll-behavior: contain;
  scrollbar-width: none;
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
          @include timebox;
          transform: translateX(-50%);
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
  flex: 0 0 var(--sidebar-width);
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--c-bg-items);
  color: var(--c-text-muted);

  border-color: var(--c-borders);
  border-style: solid;
  border-right-width: 1px;

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
  @include timebox;

  position: sticky;
  right: 0;
  left: var(--sidebar-width);
  transform: translateY(var(--header-height));
  background: var(--c-textbox-bg-red);
  color: var(--c-textbox-text-red);
  border: 1px solid var(--c-textbox-borders-red);
  border-radius: borders.$radius-xs;
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
    padding: 0;
    justify-content: center;
    border: 1px solid var(--c-textbox-borders-purple);
    background: var(--c-textbox-bg-purple);
    color: var(--c-textbox-text-purple);
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
  @include timebox;

  flex: 0 0 auto;
  background: var(--c-textbox-bg-purple);
  color: var(--c-textbox-text-purple);
  border: 1px solid var(--c-textbox-borders-purple);
  border-radius: borders.$radius-xs;
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
</style>
