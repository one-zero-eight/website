# BookingTimeline — React Rewrite Roadmap

## Overview

Rewrite `BookingTimeline.vue` as a set of React + TypeScript components using TailwindCSS v4 and DaisyUI classes. Total effort is significant — this is the most complex component in the project.

---

## Phase 1: Foundation (hooks & utilities)

No UI yet. Pure logic that everything else depends on.

### Step 1.1 — Custom React hooks

Create `src/lib/ui/use-now.ts`, `src/lib/ui/use-scroll.ts`, `src/lib/ui/use-element-size.ts`, `src/lib/ui/use-media-query.ts`.

**`useNow(intervalMs)`**

- Returns a reactive `Date` updated every `intervalMs`.
- `useState<Date>(new Date())` + `useEffect` with `setInterval`.

**`useScroll(elRef)`**

- Returns `{ x: number, y: number }`.
- Attaches `scroll` event listener to the element.
- Use a ref callback to attach/detach.

**`useElementSize(elRef)`**

- Returns `{ width: number, height: number }`.
- Uses `ResizeObserver` in a `useEffect`.

**`useMediaQuery(query)`**

- Returns boolean.
- Uses `window.matchMedia(query)` with a change listener.

### Step 1.2 — Timeline utility functions

Create `src/components/room-booking/timeline/utils.ts` (or extend existing `utils.ts`).

Pure functions to port:
| Function | From Vue lines | Notes |
|----------|---------------|-------|
| `msToPx(ms, ppm)` | L116–117 | Needs `pixelsPerMinute` passed in |
| `dayTitle(d)` | L123–129 | `d.toLocaleDateString("en-US", ...)` |
| `timeGridNeighbors(time, gridScale)` | L143–149 | Returns `[left, right]` |
| `slotsEqual(a, b)` | L135–141 | Deep equality for Slot |
| `bookingRangeByHoverDate(dateMs, dur, gridScale)` | L419–434 | Initial snapped range |
| `rangeIntersectingBookings(aMs, bMs, roomId, ...)` | L296–344 | Binary search overlap |
| `validRangeForPosition(posMs, roomId, dur, ...)` | L436–491 | Validate/adjust range |
| `validStretchedSlotRange(roomId, initial, target, ...)` | L505–563 | Validate stretch drag |
| `clientCoordinatesWithinOverlay(x, y, overlayEl)` | L565–572 | Hit test |
| `positionByClientCoordinates(x, y, scrollerEl, ...)` | L574–598 | Coord → grid position |
| `validSlotByState(state, ...)` | L637–692 | State → Slot |
| `snappedSafeNow(now, gridScale)` | L280–283 | Earliest allowed start |

These functions should accept their external dependencies as parameters (e.g., `bookingsByRoomSorted`, `prefixMaxEnd`, `safeLeft`, `pixelsPerMinute`, `timelineStart`, `sidebarWidth`, `scrollX`, `scrollY`, `ROW_HEIGHT`, `HEADER_HEIGHT`) rather than closing over reactive state. This keeps them pure and testable.

---

## Phase 2: Interaction State Machine

Pure logic, no DOM or React.

### Step 2.1 — Types

Create `src/components/room-booking/timeline/interaction-machine.ts`.

Port the `InteractionState` union type and the transition map structure. The state machine is a pure reducer:

```ts
function interactionReducer(
  state: InteractionState,
  action: { event: Event; eventType: string; ... },
  context: { /* dependencies like overlayEl, scrollerEl, etc. */ }
): InteractionState | null
```

Each transition function from the Vue code becomes a pure function:

| Transition                         | Vue lines |
| ---------------------------------- | --------- |
| `transition1_mousemove`            | L826–841  |
| `transition2_mousedown`            | L843–879  |
| `transition3_mouseleave`           | L881–883  |
| `transition4_mousemove`            | L885–904  |
| `transition5_touchend`             | L906–919  |
| Touch start handler (idle state)   | L734–771  |
| Touch move handler (dragging-edge) | L774–820  |

### Step 2.2 — Touch disambiguation

Port the `lastTouchTimeStamp` / `isTouchEvent` logic. In React this can be a `useRef` for the timestamp and a stable callback.

---

## Phase 3: Leaf Components (bottom-up)

Build the smallest, simplest components first. Each is a single file with Tailwind classes.

### Step 3.1 — `TimeGridSvg.tsx`

SVG pattern with vertical ruler lines every 15 minutes.

- Props: `scrollX`, `pixelsPerMinute`, `sidebarWidth`, `headerHeight`, `bodyHeight`.
- The pattern's `x` offset = `-(scrollX % (pixelsPerMinute * 60))`.
- Pattern repeats every hour (4 lines at 0, 15, 30, 45 min with varying opacity).

### Step 3.2 — `NowIndicator.tsx`

- **NowRuler**: 1px wide vertical red line. `left: sidebarWidth + msToPx(now - timelineStart) - scrollX`.
- **NowTimebox**: Sticky red badge with `clockTime(now)`. Click → `scrollToNow`.
- Props: `now`, `timelineStart`, `scrollX`, `pixelsPerMinute`, `sidebarWidth`, `headerHeight`, `bodyHeight`, `onScrollToNow`.

### Step 3.3 — `BookingBar.tsx`

Single existing booking bar.

- Props: `booking`, `position` (offsetX, length), `rowIndex`, `scrollX`, `sidebarWidth`.
- Positioned absolutely: `left: var(--sidebar-width) + offsetX - scrollX`, `top: rowIndex * ROW_HEIGHT`.
- Width from `position.length`.
- Green styling when `booking.related_to_me`.
- Title is sticky-left inside the bar.
- `onClick` → emits `bookingClick`.
- Wrapped in `React.memo` with key on `booking.id`.

### Step 3.4 — `NewBookingPreview.tsx`

Purple preview bar + ruler lines + timebox labels.

- Props: `newBookingData`, `newBookingTouched`, `isDragging`, `sidebarWidth`, `headerHeight`.
- Includes the `#new-booking-box` element for touch edge detection.
- Visibility rules:
  - No `newBookingData` → everything hidden.
  - `!isDragging && !newBookingTouched` → end ruler + end timebox hidden.
  - `newBookingTouched` → circular drag handles visible (::before/::after).

### Step 3.5 — `RoomList.tsx`

Left sidebar with room names, synced to vertical scroll.

- Props: `rooms`, `roomsLoading`, `scrollY`, `compactMode`, `containerHeight`.
- Positioned `absolute, left:0, top:HEADER_HEIGHT`.
- Height = `containerHeight - HEADER_HEIGHT`, `overflow: hidden`.
- Inner div: `transform: translateY(-scrollY)`, `will-change: transform`.
- Each row: room name (or `short_name` in compact), color-coded left border via `accessLevelColors`.
- Links to `/room-booking/rooms/{roomId}`.
- Skeleton placeholders when loading.

### Step 3.6 — `TimelineHeader.tsx`

Day/hour header row (virtualized).

- Props: `visibleDates`, `timelineStart`, `scrollX`, `pixelsPerMinute`, `sidebarWidth`, `compactMode`.
- Each day column is positioned absolutely at `dayOffset`.
- Shows day title + 24 hour labels.

### Step 3.7 — `TimelineOverlay.tsx`

A single div with `pointer-events: none` that sits over the interactive area.

- Props: `sidebarWidth`, `headerHeight`.
- Positioned absolute, covering everything below the header and to the right of the sidebar.

### Step 3.8 — `BookingButtons.tsx`

Cancel / Book buttons for touch mode.

- Props: `visible` (boolean), `onCancel`, `onConfirm`.
- Only rendered when `visible` is true.
- Cancel → ghost/secondary button.
- Book → primary/purple button.

---

## Phase 4: Main Container Component

### Step 4.1 — `BookingTimeline.tsx`

The orchestrator. Assembles all pieces.

**Props:**

```ts
interface BookingTimelineProps {
  startDate: Date;
  endDate: Date;
  rooms: SchemaRoom[] | undefined;
  isRoomsPending: boolean;
  bookings: SchemaBooking[] | undefined;
  isBookingsPending: boolean;
  onBook: (slot: Slot) => void;
  onBookingClick: (booking: Booking) => void;
}
```

**Ref forwarding:**

```ts
export interface BookingTimelineHandle {
  scrollTo: (options: ScrollToOptions) => void;
}
```

**Internal structure:**

1. **Hooks setup** (top of component):
   - `useMediaQuery` → `compactMode`.
   - `useRef` for `scrollerEl`, `wrapperEl`, `overlayEl`.
   - `useScroll(scrollerEl)` → `scrollX`, `scrollY`.
   - `useElementSize(scrollerEl)` → `containerWidth`, `containerHeight`.
   - `useNow(1000)` → `now`.

2. **Derived values** (`useMemo` chain):
   - `sidebarWidth`, `pixelsPerMinute` from compact mode.
   - `timelineDates`, `totalTimelineWidth`, `totalBodyHeight`.
   - `visibleRangePx`, `visibleTimeRange`, `visibleDates`.
   - `actualRooms`, `actualBookings`, `actualBookingsByRoomSorted`, `actualBookingsByRoomPrefixMaxEnd`.
   - `bookingPositions`.
   - `safeLeft = snappedSafeNow(now, TIME_GRID_SCALE)`.

3. **Interaction state**:
   - `useState<InteractionState>({ type: "idle" })`.
   - `lastTouchTimeStamp` as `useRef`.
   - `useEffect` to register/unregister event listeners on `scrollerEl` based on current state type.
   - `newBookingTouched`, `newBookingSlot`, `newBookingData` as `useMemo`.

4. **Callbacks**:
   - `handleBookingClick`, `handleBookingCancel`, `handleBookingConfirm`.
   - `scrollTo`, `scrollToNow`.

5. **On mount**: scroll to now with 30min offset.

6. **Render**:

   ```
   .root (flex flex-col gap-2)
     .timeline (relative overflow-hidden)
       .corner (absolute top-0 z-5) — "Timeline" label
       .scroller (ref=scrollerEl, overflow-auto)
         .wrapper (ref=wrapperEl, sticky left-0)
           <TimeGridSvg />
           <NowIndicator />
           <NewBookingPreview />
           <TimelineHeader />
           .body (relative)
             .bookings-layer (absolute top-0 left-0)
               {rooms.map(room =>
                 visibleBookings.map(booking =>
                   <BookingBar key={booking.id} ... />
                 )
               )}
       <RoomList />
       <TimelineOverlay ref=overlayEl />
     <BookingButtons visible={newBookingTouched} ... />
   ```

7. **CSS Custom Properties** set via inline `style` on `.timeline`.

---

## Phase 5: Integration

### Step 5.1 — Page route

Create the route file (if not already exists) at `src/app/routes/_with_menu/room-booking.timeline.tsx` or similar, following the project's route pattern.

Pass `startDate`, `endDate`, `rooms`, `bookings` from API data (use TanStack Query in the page component or in BookingTimeline itself — follow the project's data fetching guidelines).

### Step 5.2 — Wire up API

Use `$roomBooking` queries to fetch rooms and bookings. Pass `isRoomsPending` / `isBookingsPending` from query state.

### Step 5.3 — Wire up BookingModal

When `onBookingClick` fires, open the existing `BookingModal` component.

### Step 5.4 — Wire up book action

When `onBook` fires, call the create booking mutation and invalidate queries on success.

---

## Phase 6: Polish

### Step 6.1 — Styling refinement

- Ensure compact mode layout works at `< 768px`.
- Dark mode compatibility (use DaisyUI's `data-theme="dark"` handling).
- Skeleton loading states.

### Step 6.2 — Performance

- `React.memo` on `BookingBar`, `RoomList` rows.
- Ensure `useMemo` dependencies are minimal — the state machine updates should not cause full re-renders of all booking bars.
- The event listener `useEffect` should clean up properly to avoid leaks.

### Step 6.3 — Edge case testing

- Touch device testing (Chrome DevTools device emulation).
- Zero rooms / zero bookings.
- Rapid clicking / dragging.
- Resize while dragging.
- Scroll position preservation.

---

## Execution Order Summary

```
Phase 1: Hooks + Utils         (no UI, ~4 files)
Phase 2: State Machine          (pure logic, ~1 file)
Phase 3: Leaf Components        (UI only, ~8 files)
Phase 4: Main Component         (orchestration, ~1 file)
Phase 5: Integration            (route + API wiring)
Phase 6: Polish                 (styling, perf, testing)
```

Phases 1 and 2 can be done in parallel. Phase 3 can start after Phase 1 (leaf components don't need the state machine). Phase 4 needs 1+2+3. Phase 5 needs 4. Phase 6 is last.

Each step produces a working, testable artifact — e.g., after Step 1.2 you can unit-test the pure functions; after Step 3.3 you can render a `BookingBar` in Storybook or a test page.
