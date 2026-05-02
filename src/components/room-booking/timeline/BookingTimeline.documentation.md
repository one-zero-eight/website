# BookingTimeline — Documentation for React Reimplementation

## 1. Purpose

A horizontally-scrollable, vertically-sorted timeline for viewing and creating room bookings. Rooms are rows (vertical axis), time is the horizontal axis. The user can:

- **View** existing bookings as colored bars positioned on the timeline.
- **Create** new bookings via mouse drag or touch interaction.
- **Click** existing bookings to see details.
- **Scroll** horizontally across days, vertically across rooms.
- See a **"now" ruler** that tracks real time.

---

## 2. Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  .root                                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ .timeline (position: relative; overflow: hidden)     │ │
│  │                                                      │ │
│  │  ┌──────────┬─────────────────────────────────────┐  │ │
│  │  │ .corner  │  .header (sticky top, dates + hours) │  │ │
│  │  │ "Timeline"│  day1  day2  day3 ...              │  │ │
│  │  ├──────────┼─────────────────────────────────────┤  │ │
│  │  │ .room-   │  .body / .scroller                  │  │ │
│  │  │  list    │    .wrapper                          │  │ │
│  │  │ (sticky  │      .bookings-layer (absolute)      │  │ │
│  │  │  left,   │        booking bars                  │  │ │
│  │  │  syncs   │      .rulers-svg (time grid bg)      │  │ │
│  │  │  vert    │      .now-ruler (vertical line)      │  │ │
│  │  │  scroll) │      .now-timebox (sticky "now")     │  │ │
│  │  │          │      .new-booking (drag preview)     │  │ │
│  │  │          │      .new-booking-ruler-start/end    │  │ │
│  │  │          │      .new-booking-timebox-start/end  │  │ │
│  │  │          │                                      │  │ │
│  │  │          │  .overlay (pointer-events: none)     │  │ │
│  │  └──────────┴─────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ .buttons (Cancel / Book) — only when touch-active    │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Key layers (back to front z-order):

| z-index  | Layer                                                    | Purpose                             |
| -------- | -------------------------------------------------------- | ----------------------------------- |
| 0        | `.rulers-svg`                                            | Time grid vertical lines            |
| 0 (body) | `.bookings-layer`                                        | Existing booking bars               |
| 1        | `.now-ruler`, `.new-booking-ruler-*`                     | Vertical indicator lines            |
| 1        | `.new-booking`                                           | New booking preview bar             |
| 2        | `.header`                                                | Sticky day/hour header              |
| 4        | `.room-list`                                             | Sticky left sidebar with room names |
| 4        | `.now-timebox-wrapper`, `.new-booking-timeboxes-wrapper` | Time labels                         |
| 5        | `.corner`                                                | Top-left corner "Timeline" label    |

---

## 3. Props (Component API)

```ts
interface Props {
  startDate: Date;
  endDate: Date;
  rooms: SchemaRoom[] | undefined; // from API
  isRoomsPending: boolean;
  bookings: SchemaBooking[] | undefined; // from API
  isBookingsPending: boolean;
}
```

### Emits (callbacks):

```ts
{
  book: [slot: Slot];           // When user confirms a new booking
  bookingClick: [booking: Booking];  // When user clicks an existing booking
}
```

### Exposed method:

```ts
scrollTo(options: ScrollToOptions);   // Programmatic scroll
```

---

## 4. Data Types

```ts
type Room = SchemaRoom & { idx: number }; // idx = row index (0-based)
type Booking = Omit<SchemaBooking, "start" | "end"> & {
  startsAt: Date;
  endsAt: Date;
};
type Slot = {
  room: Room;
  start: Date;
  end: Date;
};
type ScrollToOptions = {
  to: Date;
  behavior?: "smooth" | "instant";
  position?: "left" | "center" | "right";
  offsetMs?: number;
};
type Position = { room: Room; date: Date }; // A point on the timeline grid
type BookingPosition = { offsetX: number; length: number }; // px values
```

---

## 5. Constants

| Constant                          | Value                  | Meaning                                 |
| --------------------------------- | ---------------------- | --------------------------------------- |
| `COMPACT_VERSION_WIDTH_THRESHOLD` | `768` px               | Break for compact mode                  |
| `SIDEBAR_WIDTH_DEFAULT`           | `200` px               | Room name column width                  |
| `SIDEBAR_WIDTH_COMPACT`           | `65` px                | Compact room name column                |
| `PIXELS_PER_MINUTE_DEFAULT`       | `100/30` ≈ 3.33 px/min | Scale factor                            |
| `PIXELS_PER_MINUTE_COMPACT`       | `85/30` ≈ 2.83 px/min  | Scale factor compact                    |
| `HEADER_HEIGHT`                   | `60` px                | Top header bar                          |
| `ROW_HEIGHT`                      | `50` px                | Per-room row                            |
| `TIME_GRID_SCALE`                 | `5 * T.Min` = 5 min    | Snap grid for time                      |
| `MIN_BOOKING_DURATION`            | `15 * T.Min` = 15 min  | Minimum slot length                     |
| `MAX_BOOKING_DURATION`            | `3 * T.Hour` = 3 h     | Maximum slot length                     |
| `NEW_BOOKING_BOX_ID`              | `"new-booking-box"`    | DOM id for touch edge detection         |
| `HORIZONTAL_OVERSCAN_PX`          | `500`                  | Extra pixels rendered for smooth scroll |

---

## 6. Core Derived Values (computed/useMemo chain)

### 6a. Responsive / Scale

- **`compactModeEnabled`** — `useMediaQuery("(max-width: 768px)")` — boolean.
- **`sidebarWidth`** — 200 or 65 based on compact mode.
- **`pixelsPerMinute`** — 100/30 or 85/30 based on compact mode.

### 6b. Conversion helpers

- **`msToPx(ms)`** — `(ms / T.Min) * pixelsPerMinute`.
- **`px(n)`** — `` `${n}px` ``.

### 6c. Timeline dimensions

- **`timelineDates`** — Array of day-boundary `Date` objects from `startDate` to `endDate`.
- **`totalTimelineWidth`** — `msToPx(endDate - startDate)` in px.
- **`totalBodyHeight`** — `roomCount * ROW_HEIGHT`.

### 6d. Scroll/virtualization (from `useScroll` + `useElementSize` on scrollerEl)

- **`scrollX`, `scrollY`** — current scroll offsets.
- **`containerWidth`, `containerHeight`** — scroller element dimensions.
- **`visibleRangePx`** — `{ left, right, width }` in px, includes ±500px overscan.
- **`visibleTimeRange`** — `{ startMs, endMs }` converted from visible px range.
- **`visibleDates`** — subset of `timelineDates` that intersect `visibleTimeRange`.

### 6e. Room/bookings pre-processing

- **`actualRooms`** — rooms with `.idx` appended.
- **`actualBookings`** — `Map<id, Booking>` (with `startsAt`/`endsAt` as Date).
- **`actualBookingsByRoomSorted`** — `Map<roomId, Booking[]>` sorted by `startsAt` (for binary search).
- **`actualBookingsByRoomPrefixMaxEnd`** — `Map<roomId, number[]>` — prefix maximums of `endsAt` per room (for efficient overlap queries).
- **`bookingPositions`** — `Map<bookingId, { offsetX, length }>` — px positions relative to timeline start.

### 6f. Now elements

- **`now`** — reactive `Date` updated every second.
- **`nowRulerCssVars`** — `{ "--now-x": px(msToPx(now - timelineStart) - scrollX) }`.
- **`snappedSafeNow()`** — current time + 1 minute, snapped right to the 5-min grid. This is the **earliest allowed start** for new bookings.

### 6g. New booking state

- **`newBookingTouched`** — `true` when interaction state is `touch-inactive` or `touch-dragging-edge`.
- **`newBookingSlot`** — `Slot | null`, derived from interaction state via `validSlotByState()`.
- **`newBookingData`** — `{ duration, durationText, startTime, endTime, cssVars }` — positioning/style data for the new-booking preview DOM elements.

---

## 7. Interaction State Machine (THE MOST COMPLEX PART)

This is the heart of the component. It handles mouse AND touch interactions with a unified state machine.

### 7a. States

```ts
type InteractionState =
  | { type: "idle" } // Nothing happening
  | { type: "mouse-hovering"; hoverAt: Position } // Mouse over timeline
  | { type: "mouse-dragging"; clickAt: Position; dragAt: Position } // Mouse drag
  | { type: "touch-inactive"; slot: Slot } // Touch: new booking exists, not currently touching
  | {
      type: "touch-dragging-edge";
      slot: Slot;
      edge: "left" | "right";
      touchId: number;
    };
// Touch: dragging left/right edge
```

### 7b. State Transitions Table

```
IDLE
  ├── mousemove (on overlay)   →  MOUSE-HOVERING    (shows hover preview)
  ├── mousedown (on overlay)   →  MOUSE-DRAGGING     (starts drag)
  └── touchstart               →  IDLE               (just records timestamp)

MOUSE-HOVERING
  ├── mousemove (on overlay)   →  MOUSE-HOVERING    (update position)
  ├── mousedown                →  MOUSE-DRAGGING     (start drag at hover position)
  └── mouseleave (overlay)     →  IDLE

MOUSE-DRAGGING
  ├── mousemove               →  MOUSE-DRAGGING     (update drag position)
  └── mouseup                 →  IDLE               (emit "book" with valid slot)

TOUCH-INACTIVE
  └── touchstart (on edges of new-booking box)
      ├── hits left edge      →  TOUCH-DRAGGING-EDGE (edge: "left")
      ├── hits right edge     →  TOUCH-DRAGGING-EDGE (edge: "right")
      └── misses edges        →  null (no transition)

TOUCH-DRAGGING-EDGE
  ├── touchmove               →  TOUCH-DRAGGING-EDGE (update slot range)
  ├── touchend                →  TOUCH-INACTIVE      (keep adjusted slot)
  └── touchcancel             →  TOUCH-INACTIVE
```

### 7c. Touch vs Mouse disambiguation

```ts
let lastTouchTimeStamp = -Infinity;
const isTouchEvent = (e: Event) =>
  Math.abs(lastTouchTimeStamp - e.timeStamp) < 1000; // 1 sec window

// In "idle" state:
//   touchstart → records timestamp, returns null (no state change)
// Then immediately the browser fires a mousedown at the same position.
//   mousedown → checks isTouchEvent → true → treats as touch, not mouse
```

This is critical: on touch devices, `touchstart` fires first, then the browser synthesizes a `mousedown`. The code:

1. Records `lastTouchTimeStamp` on `touchstart`.
2. In `mousedown` handler, if `isTouchEvent` returns true, treats it as a **touch tap** (creates `touch-inactive` with a valid slot) instead of starting mouse drag.

### 7d. Event listener registration pattern

The component watches `interactionState.value.type` and `scrollerEl`. When either changes, it:

1. Finds the transition map for the current state.
2. Registers all event listeners from that map on `scrollerEl`.
3. Each listener computes the next state; if non-null, updates `interactionState`.
4. On cleanup, removes all listeners.

This means only the listeners relevant to the current state are active — not all listeners all the time.

---

## 8. Slot Validation Logic

### 8a. `validSlotByState(state)` → `Slot | null`

Dispatches based on state type:

- **`idle`** → `null`.
- **`mouse-hovering`** → calls `validRangeForPosition(hoverAt.date, hoverAt.room.id)`.
- **`mouse-dragging`** → calls `validRangeForPosition(clickAt.date, clickAt.room.id)` to get initial range `[l, r]`. Then:
  - If `dragMs < l` → snap `dragMs` left on grid, stretch left via `validStretchedSlotRange(roomId, r, dragSnapped)`.
  - If `dragMs > r` → snap `dragMs` right on grid, stretch right via `validStretchedSlotRange(roomId, l, dragSnapped)`.
  - If inside → keep `[l, r]`.
- **`touch-inactive`** / **`touch-dragging-edge`** → returns `state.slot` unchanged.

### 8b. `validRangeForPosition(posMs, roomId, duration)` → `[number, number] | null`

1. Compute initial range `[l, r]` centered on `posMs` with given `duration`, snapped to 5-min grid.
2. **Constraint: must be after now.** If `l < safeLeft`, shift range right. If `posMs` falls outside after shifting → `null`.
3. **Constraint: no overlapping bookings.** Call `rangeIntersectingBookings(l, r, roomId)`:
   - 0 overlaps → OK.
   - 1 overlap → try to nudge range left or right past the overlapping booking. After adjustment, re-check for overlaps. If still overlapping → `null`.
   - 2+ overlaps → `null` (no valid position).
4. Final check: `l < safeLeft` → `null`.

### 8c. `validStretchedSlotRange(roomId, dInitialMs, dTargetMs, maxDuration)` → `[number, number] | null`

Used when dragging to expand/shrink a slot.

- If `dInitialMs < dTargetMs` (stretching right):
  1. Clamp target to `dInitialMs + maxDuration`.
  2. Find first intersecting booking between `dInitialMs` and `dTargetMs`.
  3. If found, clamp `dTargetMs` to the booking's start time.
  4. Return `[dInitialMs, dTargetMs]`.
- If `dInitialMs > dTargetMs` (stretching left):
  1. Clamp target to `dInitialMs - maxDuration`, and to `safeLeft`.
  2. Find last intersecting booking between `dTargetMs` and `dInitialMs`.
  3. If found, clamp `dTargetMs` to the booking's end time.
  4. Return `[dTargetMs, dInitialMs]`.

### 8d. `rangeIntersectingBookings(aMs, bMs, roomId)` → `Booking[]`

Uses **two binary searches** on the sorted bookings array + prefix-max-end array:

1. Find `rightExclusive` — first index where `startsAt >= bMs`.
2. Find `leftCandidate` — first index where `prefixMaxEnd > aMs` (i.e., some booking in prefix could intersect).
3. Linear scan between `[leftCandidate, rightExclusive)` to collect bookings where `endsAt > aMs`.

This is O(log N + K) where K is the result count. Crucial for performance since this is called on every mouse move.

---

## 9. Coordinate Conversions

### 9a. `clientCoordinatesWithinOverlay(x, y)` → `boolean`

Checks if client coordinates fall within the overlay element's bounding rect. Used as a gate — if the pointer is outside the overlay (e.g., on the sidebar or above the header), interactions are ignored.

### 9b. `positionByClientCoordinates(x, y)` → `Position | null`

1. Get `scrollerEl` bounding rect.
2. Convert to viewport coordinates: `viewportX = x - cornerX - sidebarWidth`, `viewportY = y - cornerY - HEADER_HEIGHT`.
3. Add scroll offset: `timelineX = viewportX + scrollX`, `timelineY = viewportY + scrollY`.
4. Room index: `Math.floor(timelineY / ROW_HEIGHT)`.
5. Date: `timelineStart + (timelineX / pixelsPerMinute) * T.Min`.

Returns `null` if room index is out of bounds.

---

## 10. Horizontal Virtualization

Only dates intersecting the visible viewport (plus 500px overscan) are rendered:

- **Header items** (`visibleDates`): only the day columns in view.
- **Bookings** (`visibleTimeRange`): only bookings intersecting `[startMs, endMs]` per room are rendered, using `rangeIntersectingBookings()`.

The `.spacer` element (or `::after` pseudo-element) maintains the full scrollable width so the scrollbar works correctly.

---

## 11. Touch-Specific Behaviors

### 11a. Two-phase touch booking flow

1. **Tap** on the timeline → creates a `touch-inactive` state with a valid slot. A "new booking" preview appears.
2. **Tap and drag the edges** of the preview box → enters `touch-dragging-edge`. The user adjusts start/end by dragging.
3. **Confirm** → taps the "Book" button (shown only when `newBookingTouched` is true).
4. **Cancel** → taps "Cancel" or touches outside.

### 11b. Edge detection for touch

When entering `touch-dragging-edge`, the code:

1. Gets the bounding rect of the `#new-booking-box` element.
2. Checks vertical hit: `y0` must be within `boxRect.y - 6` to `boxRect.y + height + 6` (6px tolerance).
3. Checks horizontal proximity: if `|x0 - leftEdge| < 12px` → left edge; if `|x0 - rightEdge| < 12px` → right edge.
4. If neither edge, no transition (user missed the handles).

### 11c. Visual feedback during touch

When `newBookingTouched` is true (`data-new-touched` attribute):

- The `.new-booking > div` shows two circular handles (::before and ::after pseudo-elements) on the left and right edges.
- When the state is `mouse-dragging` or `newBookingTouched` (`data-new-pressed`), the **end** ruler and end timebox are visible; otherwise hidden.

---

## 12. Visual Elements

### 12a. Time grid (`.rulers-svg`)

An SVG pattern with vertical lines every 15 minutes (at 0, 15, 30, 45), with varying opacity. The pattern's `x` offset is set to `-(scrollX % hourWidth)` so lines stay aligned as you scroll.

### 12b. Now indicator

- **`.now-ruler`**: 1px wide vertical red line spanning the full body height, positioned at `--now-x`.
- **`.now-timebox`**: A sticky red badge showing current time (`HH:MM`), clickable to scroll-to-now.

### 12c. New booking preview

- **`.new-booking`**: Purple bar positioned at `(--new-x, --new-y)` with width `--new-length`.
- **`.new-booking-ruler-start/end`**: Vertical purple lines at start/end of the new booking.
- **`.new-booking-timebox-start/end`**: Labels showing start/end times above the bar.

Visibility rules:

- When `data-has-new` is not set (no `newBookingData`) → all new-booking elements hidden.
- When `data-new-pressed` is not set → end ruler and end timebox hidden (only start shown during hover).

### 12d. Existing bookings

- Positioned absolutely: `left: sidebarWidth + offsetX - scrollX`, `top: rowIndex * ROW_HEIGHT`.
- Width from `bookingPositions`.
- Title text is sticky-left within the bar (so it stays visible when scrolling horizontally past the bar).
- `myBooking` class added when `booking.related_to_me` is true → green styling.
- Click handler uses `data-booking-id` attribute on the wrapper div.

### 12e. Room list (left sidebar)

- Positioned absolute, `left: 0`, `top: HEADER_HEIGHT`, height = `containerHeight - HEADER_HEIGHT`.
- Inner div uses `transform: translateY(-scrollY)` to sync with vertical scroll. Uses `will-change: transform`.
- Each row shows room name (or `short_name` in compact mode), color-coded left border via `accessLevelColors`.
- Links to `/room-booking/rooms/{roomId}`.

### 12f. Loading state

When `bookingsLoading` or `roomsLoading`:

- Room list shows placeholder skeleton rows (18 default).
- Booking layer shows skeleton placeholder bars (one per row, full visible width, opacity 0.5).

---

## 13. Edge Cases Handled

| Edge case                                          | How handled                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Booking starts/ends exactly at another booking** | `rangeIntersectingBookings` uses strict `>` for `endsAt > aMs` and `<` for starts — a booking ending exactly at `aMs` is NOT considered intersecting (1ms tolerance). |
| **Mouse leaves overlay**                           | `mouseleave` event transitions to `idle`. `mousemove` outside overlay also returns `idle`.                                                                            |
| **Dragging outside overlay**                       | `transition4_mousemove` returns `null` (no change) when outside, keeping the last valid drag position.                                                                |
| **Touch vs mouse on same device**                  | `isTouchEvent` disambiguation using timestamp heuristics (1s window).                                                                                                 |
| **Creating booking in the past**                   | `snappedSafeNow()` enforces all new bookings must start at or after `now + 1min` snapped to grid.                                                                     |
| **Booking overlapping multiple existing bookings** | `validRangeForPosition` returns `null` for 2+ overlaps.                                                                                                               |
| **Zero rooms**                                     | `actualRooms` returns empty array; `positionByClientCoordinates` returns `null` for any click.                                                                        |
| **Room list taller than viewport**                 | Vertical scroll syncs sidebar with scroller. Sidebar uses `overflow: hidden` to clip.                                                                                 |
| **Horizontal scroll with many days**               | Virtualization renders only visible dates + 500px overscan. Spacer maintains scroll width.                                                                            |
| **Minimum/maximum booking duration**               | Enforced in `validStretchedSlotRange` (max) and in `touchmove` handler (min).                                                                                         |
| **Slot adjusted past now after overlap nudge**     | `validRangeForPosition` re-checks `l < safeLeft` after adjustments.                                                                                                   |
| **Window resize**                                  | Compact mode reactively switches via `useMediaQuery`.                                                                                                                 |
| **Initial load scroll to now**                     | `onMounted` calls `scrollToNow({ behavior: "instant", position: "left", offsetMs: -30min })`.                                                                         |
| **Rapid fire events**                              | State machine guards: `event.preventDefault()` + `stopImmediatePropagation()` on mousedown to prevent text selection.                                                 |

---

## 14. React Reimplementation Notes

### 14a. Vue → React mappings

| Vue                                                      | React                                            |
| -------------------------------------------------------- | ------------------------------------------------ |
| `ref<T>(null)`                                           | `useRef<T>(null)`                                |
| `shallowRef`                                             | `useRef` (or `useState` with shallow comparison) |
| `computed`                                               | `useMemo`                                        |
| `watch(source, fn, { immediate })`                       | `useEffect(fn, deps)`                            |
| `watch(..., onCleanup)`                                  | Return cleanup fn from `useEffect`               |
| `defineProps`                                            | Function props                                   |
| `defineEmits`                                            | Callback props                                   |
| `defineExpose`                                           | `useImperativeHandle`                            |
| `v-if` / `v-else-if`                                     | Ternary / `&&`                                   |
| `v-for`                                                  | `.map()`                                         |
| `v-show`                                                 | `style={{ display: ... }}` or CSS class          |
| `:class` / `:style` object                               | `className` / `style` objects                    |
| `@click`, `@mousedown`, etc.                             | `onClick`, `onMouseDown`, etc.                   |
| `$style.xxx` (CSS modules)                               | Import CSS module or use Tailwind classes        |
| `useNow`, `useScroll`, `useElementSize`, `useMediaQuery` | Custom hooks or libraries                        |

### 14b. Key hooks needed

- **`useNow({ interval })`** — returns reactive Date. Simple `useState` + `setInterval` in `useEffect`.
- **`useScroll(elRef)`** — returns `{ x, y }`. Listen to `scroll` event on element.
- **`useElementSize(elRef)`** — returns `{ width, height }`. Use `ResizeObserver`.
- **`useMediaQuery(query)`** — returns boolean. Use `window.matchMedia`.

### 14c. State machine implementation

The state machine in React can be implemented as:

- A `useReducer` with the state type as the reducer state.
- The event listener registration in a `useEffect` keyed on `[state.type, scrollerEl]`.
- Each transition function becomes an action handler.

Alternatively, keep a simpler `useState<InteractionState>` and update it directly in event handlers (the Vue code effectively does this via `interactionState.value = ...`).

### 14d. Performance considerations

- `bookingPositions`, `visibleDates`, `newBookingData` → `useMemo`.
- The binary search functions (`rangeIntersectingBookings`) are pure functions, no hooks needed.
- Avoid re-rendering all booking bars on every mouse move: the booking bars for rooms that aren't being interacted with don't change. Consider `React.memo` on the booking bar component, keyed by `booking.id`.
- The rulers-svg pattern offset needs to update on scroll — this can be done via CSS custom properties rather than re-rendering the SVG.

### 14e. Tailwind/DaisyUI styling strategy

Instead of SCSS modules, use Tailwind utility classes + CSS custom properties for dynamic values:

- Set CSS vars on the `.timeline` container div via `style` prop.
- Use arbitrary values like `left-[var(--new-x)]` or `w-[var(--new-length)]` where Tailwind doesn't support dynamic values natively.
- Use `className="skeleton"` for loading placeholders (DaisyUI provides this).
- The time grid SVG can remain an inline SVG (it's small).

### 14f. Component split suggestion

```
BookingTimeline/
├── BookingTimeline.tsx        # Main container, state machine, data prep
├── TimelineHeader.tsx         # Day/hour header row (virtualized)
├── TimelineBody.tsx           # Body with booking layer
├── BookingBar.tsx             # Single booking bar (memo'd)
├── NewBookingPreview.tsx      # The purple preview bar + rulers + timeboxes
├── NowIndicator.tsx           # Now ruler + timebox
├── RoomList.tsx               # Left sidebar room names
├── TimeGridSvg.tsx            # The SVG rulers pattern
├── TimelineOverlay.tsx        # The pointer-events-none overlay div
├── BookingButtons.tsx         # Cancel/Book buttons (touch mode)
├── utils.ts                   # msToPx, coordinate conversions, binary search
├── interaction-machine.ts     # State machine logic (pure functions)
└── types.ts                   # Already exists
```

### 14g. Files to keep / reference

- `types.ts` — already in TypeScript, reuse directly.
- `utils.ts` — `sanitizeBookingTitle`, reuse.
- `AccessLevelIcon.tsx` — already in React, reuse `accessLevelColors`.
- `dates.ts` — `clockTime`, `durationFormatted`, `msBetween`, `T` — already in TS, reuse.

---

## 15. Component CSS Custom Properties Reference

These are set on `.timeline` via inline style and consumed by children:

```css
--sidebar-width        /* px value, sidebar width */
--header-height        /* px value, 60 */
--row-height           /* px value, 50 */
--ppm                  /* raw number, pixels per minute (not px!) */
--total-width          /* px value, full scrollable width + sidebar */
--body-height          /* px value, total rows height */
--container-height     /* px value, scroller client height */
--visible-left         /* px value, visible range left edge */
--visible-width        /* px value, visible range width */
```

And on individual elements:

```css
--now-x                /* px from timeline start minus scrollX */
--new-x                /* px from timeline start minus scrollX, viewport-relative */
--new-y                /* px, row index * ROW_HEIGHT */
--new-length           /* px, booking duration in px */
--left / --width       /* px, booking position from timeline start minus scrollX */
--row-index            /* integer, 0-based */
--day-offset           /* px, day position from timeline start minus scrollX */
--row-border-color     /* color, based on access_level */
```

---

## 16. Summary of All Functions

| Function                                           | Input             | Output             | Purpose                                  |
| -------------------------------------------------- | ----------------- | ------------------ | ---------------------------------------- |
| `msToPx(ms)`                                       | milliseconds      | pixels             | Time → space conversion                  |
| `msBetween(a, b)`                                  | two Dates         | ms diff            | Safe date subtraction                    |
| `dayTitle(d)`                                      | Date              | string             | "17 Mar Mon" format                      |
| `timeGridNeighbors(time, scale)`                   | ms                | `[left, right]`    | Snap to 5-min grid                       |
| `slotsEqual(a, b)`                                 | two Slots         | boolean            | Deep comparison                          |
| `snappedSafeNow()`                                 | —                 | ms timestamp       | Minimum allowed start time               |
| `rangeIntersectingBookings(aMs, bMs, roomId)`      | time range + room | `Booking[]`        | Binary search + linear scan for overlaps |
| `bookingRangeByHoverDate(dateMs, dur)`             | center + duration | `[l, r]` ms        | Create initial snapped range             |
| `validRangeForPosition(posMs, roomId, dur)`        | position + room   | `[l, r]` or null   | Validate and adjust range                |
| `validStretchedSlotRange(roomId, initial, target)` | room + edges      | `[l, r]` or null   | Validate stretch drag                    |
| `clientCoordinatesWithinOverlay(x, y)`             | client coords     | boolean            | Hit test                                 |
| `positionByClientCoordinates(x, y)`                | client coords     | `Position` or null | Coord → grid position                    |
| `validSlotByState(state)`                          | interaction state | `Slot` or null     | State → valid slot                       |
| `scrollTo(options)`                                | scroll options    | void               | Programmatic scroll                      |
| `scrollToNow(options?)`                            | optional options  | void               | Scroll to now                            |
| `handleBookingClick(event)`                        | click event       | void               | Emit bookingClick                        |
| `handleBookingCancel()`                            | —                 | void               | Reset to idle                            |
| `handleBookingConfirm()`                           | —                 | void               | Emit book + reset to idle                |
