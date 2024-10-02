<script setup lang="ts">
import type { components, paths } from "@/lib/room-booking";
import { useEventListener, useNow } from "@vueuse/core";
import createClient from "openapi-fetch";
import type { MaybeRef } from "vue";
import { computed, onMounted, ref, shallowRef, toRaw, unref } from "vue";

const props = defineProps<{
  onBooking: (data: { from: Date; to: Date; room: Room }) => void;
}>();

onMounted(() => {
  scrollToNow("instant");
});

const PIXELS_PER_MINUTE = 100 / 30;
const MIN_BOOKING_DURATION_MINUTES = 15;
const BOOKING_DURATION_STEP = 5;

const T = {
  Ms: 1,
  Sec: 1000,
  Min: 1000 * 60,
  Hour: 1000 * 60 * 60,
  Day: 1000 * 60 * 60 * 24,
};

type Room = components["schemas"]["Room"];

interface Booking {
  id: string;
  roomId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
}

const msToPx = (ms: number) => (ms / T.Min) * PIXELS_PER_MINUTE;
const px = (n: number) => `${n}px`;

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

function dayTitle(d: Date) {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const endDate = new Date(today.getTime() + 7 * T.Day);

const SIDEBAR_WIDTH = 200;
const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 50;

const SIDEBAR_WIDTH_PX = px(SIDEBAR_WIDTH);
const HEADER_HEIGHT_PX = px(HEADER_HEIGHT);
const ROW_HEIGHT_PX = px(ROW_HEIGHT);

const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_BOOKING_API_URL,
});
const actualRooms = shallowRef<Room[]>([]);
const actualBookings = shallowRef<Booking[]>([]);
client.GET("/rooms/").then(({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }

  actualRooms.value = data;
});
client
  .GET("/bookings/", {
    params: {
      query: { start: today.toISOString(), end: endDate.toISOString() },
    },
  })
  .then(({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    actualBookings.value = data.map(({ title, room_id, start, end }) => ({
      id: `${room_id}_${start}_${end}`,
      title,
      roomId: room_id,
      startsAt: new Date(start),
      endsAt: new Date(end),
    }));
  });

const HOURS = Array.from({ length: 24 })
  .fill(null)
  .map((_, i) => i);
const HOURS_TIMES = HOURS.map((h) => `${h.toString().padStart(2, "0")}:00`);

const timelineStart = shallowRef(today);
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

interface BookingData {
  id: string;
  title: string;
  offsetX: string; // e.g. "123px"
  length: string; // e.g. "123px"
  startsAt: Date;
  endsAt: Date;
}

const bookingsDataByRoomId = computed(() => {
  const start = timelineStart.value;
  const sortedActualBookings = actualBookings.value
    .slice()
    // We assume that if booking A starts before any booking B, A also ends
    // before B start.
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const bookingsData = new Map<string, BookingData[]>();
  const totalLengths = new Map<string, number>();

  for (const { id, title, roomId, startsAt, endsAt } of sortedActualBookings) {
    const roomLength = totalLengths.get(roomId) ?? 0;

    const length = msToPx(msBetween(startsAt, endsAt));
    const booking = {
      id,
      title,
      length: px(length),
      offsetX: px(msToPx(msBetween(start, startsAt)) - roomLength),
      startsAt,
      endsAt,
    };
    totalLengths.set(roomId, roomLength + length);
    if (!bookingsData.has(roomId)) bookingsData.set(roomId, [booking]);
    else bookingsData.get(roomId)!.push(booking);
  }

  return bookingsData;
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

  const bookings = bookingsDataByRoomId.value.get(roomId);
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
  room: Room;
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
  const duration = msBetween(l, r);

  return {
    x: msToPx(msBetween(timelineStart, l)),
    y: pendingBooking.value.roomIdx * ROW_HEIGHT,
    duration,
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
  x -= cornerX + SIDEBAR_WIDTH;
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

  props.onBooking({
    from: safeRange[0],
    to: safeRange[1],
    room: toRaw(pendingBooking.value.room),
  });

  pendingBooking.value = null;
});
useEventListener(wrapperEl, "mouseleave", () => {
  pendingBooking.value = null;
});

function scrollTo(d: Date, behavior: "instant" | "smooth" = "smooth") {
  const el = scrollerEl.value;

  if (!el) return;

  scrollerEl.value?.scrollTo({
    behavior,
    // Padding 60px from the sidebar
    left: msToPx(msBetween(timelineStart, d)) - 60,
  });
}

function scrollToNow(behavior: "instant" | "smooth" = "smooth") {
  scrollTo(now.value, behavior);
}
</script>

<template>
  <div
    :class="$style.timeline"
    :style="{
      '--sidebar-width': SIDEBAR_WIDTH_PX,
      '--header-height': HEADER_HEIGHT_PX,
      '--row-height': ROW_HEIGHT_PX,
      '--ppm': PIXELS_PER_MINUTE,
      cursor: pendingBookingData ? 'crosshair' : undefined,
    }"
  >
    <div :class="$style['timeline-corner']">
      <h2>Timeline</h2>
    </div>
    <div ref="scrollerEl" :class="$style['timeline-scroller']">
      <div
        ref="wrapperEl"
        :class="$style['timeline-wrapper']"
        :style="{ '--now-x': nowRulerX }"
      >
        <span :class="$style['timeline-now']" />
        <div :class="$style['now-time-wrapper']">
          <span :class="$style['now-time-block']" @click="scrollToNow()">
            {{
              `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
            }}
          </span>
        </div>
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
        <div
          v-if="pendingBookingData"
          :class="$style['timeline-booking-new']"
          :style="{
            '--width': px(msToPx(pendingBookingData.duration)),
            '--left': px(pendingBookingData.x),
            '--top': px(pendingBookingData.y),
          }"
        >
          <div>
            <span>{{ durationFormatted(pendingBookingData.duration) }}</span>
          </div>
        </div>
        <div :class="$style['timeline-header']">
          <div
            v-for="day in timelineDates"
            :key="day.toString()"
            :class="$style['timeline-header-item']"
            :style="{ width: `${PIXELS_PER_MINUTE * 60 * 24}px` }"
          >
            <span :class="$style['timeline-header-item-day']">
              {{ dayTitle(day) }}
            </span>
            <div :class="$style['timeline-header-item-hours']">
              <span v-for="h in HOURS_TIMES" :key="h">
                <span>{{ h }}</span>
              </span>
            </div>
          </div>
        </div>
        <div :class="$style['timeline-body']">
          <div
            v-for="room in actualRooms"
            :key="room.id"
            :class="$style['timeline-row']"
          >
            <div :class="$style['timeline-row-header']">
              {{ room.title }}
            </div>
            <div
              v-for="booking in bookingsDataByRoomId.get(room.id)"
              :key="booking.id"
              :class="$style['timeline-booking']"
              :style="{ '--left': booking.offsetX, '--width': booking.length }"
            >
              <div :title="booking.title">
                <span>
                  {{ booking.title }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div ref="overlayEl" :class="$style['timeline-overlay']" />
  </div>
</template>

<style module lang="scss">
@use "./styles/_colors.scss" as colors;
@use "./styles/_effects.scss" as effects;
@use "./styles/_borders.scss" as borders;

/* TODO: extract text mixins this to _typography.scss */
/* TODO: systemize spacing (padding, margin, etc.) and use variables instead */

$time-block-width: 50px;

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

@mixin time-block {
  @include text-sm;
  width: $time-block-width;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--c-text-muted-2);
  user-select: none;
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

  &-corner {
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

  &-overlay {
    @include effects.shadow-inset-2;

    position: absolute;
    left: var(--sidebar-width);
    top: var(--header-height);
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  &-scroller {
    position: relative;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }

  &-wrapper {
    display: flex;
    flex-direction: column;
    width: fit-content;
    position: relative;

    background-image: var(--rulers-bg);
    background-position-x: var(--sidebar-width);
    background-repeat: repeat;
  }

  /* Ruler that shows current time. */
  &-now {
    z-index: 1;
    position: absolute;
    height: 100%;
    width: 1px;
    background: var(--c-ruler-now);
    left: calc(var(--sidebar-width) + var(--now-x));
    top: 0;
  }

  &-header {
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
            @include time-block;
            transform: translateX(-50%);
          }
        }
      }
    }
  }

  &-body {
    @include text-md;
    display: flex;
    flex-direction: column;
  }

  &-row {
    height: var(--row-height);
    display: flex;
    align-items: stretch;

    &-header {
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
    }
  }

  /* Item that is going to be created. */
  &-booking-new {
    @include booking;

    z-index: 1;
    position: absolute;
    left: calc(var(--sidebar-width) + var(--left));
    top: calc(var(--header-height) + var(--top));
    width: var(--width);
    height: var(--row-height);

    & > div {
      padding: 0;
      justify-content: center;
      border: 1px solid var(--c-textbox-borders-purple);
      background: var(--c-textbox-bg-purple);
      color: var(--c-textbox-text-purple);
    }
  }

  &-booking {
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

      & > span {
        position: sticky;
        left: var(--sidebar-width);
        overflow: hidden;
        text-overflow: ellipsis;
      }
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

.timeline-row:not(:last-child) {
  .timeline-row-header {
    border-bottom-width: 1px;
  }
}

.now-time-wrapper {
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
    flex: 0 0
      calc(var(--now-x) + var(--sidebar-width) - ($time-block-width / 2));
  }

  &::after {
    flex-grow: 1;
  }
}

.now-time-block {
  @include time-block;

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
</style>
