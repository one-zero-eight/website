import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/ui/cn";
import type { MeetingDate, MeetingUser } from "./types.ts";
import { countExplicitSlotAvailability } from "./utils/participants.ts";
import {
  areConsecutiveDateIds,
  getSlotHeatmapAppearance,
  getSlotHeatmapAppearanceColorblindSafe,
  getSlotKey,
  getSlotKeysBetween,
  parseSlotKey,
} from "./utils/slots.ts";

type DragMode = "add" | "remove";

// On touch we defer selecting until a short press-and-hold so a normal swipe
// scrolls the page instead of accidentally marking slots.
const LONG_PRESS_MS = 250;
const TOUCH_MOVE_CANCEL_PX = 10;

function getMeetingTimeOverlayClassName({
  continuesAbove,
  continuesBelow,
  overlapsAvailability,
}: {
  continuesAbove: boolean;
  continuesBelow: boolean;
  overlapsAvailability: boolean;
}) {
  return cn(
    "pointer-events-none absolute inset-0 border-r-2 border-l-2",
    overlapsAvailability
      ? "border-success bg-success/35"
      : "border-secondary bg-secondary/15",
    !continuesAbove &&
      (overlapsAvailability
        ? "border-t-success border-t-2"
        : "border-t-secondary border-t-2"),
    !continuesBelow &&
      (overlapsAvailability
        ? "border-b-success border-b-2"
        : "border-b-secondary border-b-2"),
  );
}

function DateNavigationButton({
  direction,
  disabled,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "btn btn-circle btn-outline shrink-0",
        disabled && "invisible",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className={cn(
          "text-lg",
          direction === "prev"
            ? "icon-[material-symbols--chevron-left]"
            : "icon-[material-symbols--chevron-right]",
        )}
      />
    </button>
  );
}

export function AvailabilitySelector({
  dates,
  timeSlots,
  users,
  viewedUserIds,
  editingUserId,
  currentUserId,
  draftSlots,
  onApplySlots,
  isPhone = false,
  allowedSlots,
  selectionOnly = false,
  hideHint = false,
  bestIntersectionSlotKeys,
  hoveredSlotKey = null,
  onHoveredSlotKeyChange,
  intervalSelectionMode = false,
  intervalSelectionSlots,
  onIntervalSelectionSlotsChange,
  onIntervalSelectionEnd,
  selectedMeetingSlotKeys,
  showCalendarOverlay = false,
  calendarSlotEvents,
  calendarConflictSlotKeys,
}: {
  dates: MeetingDate[];
  timeSlots: string[];
  users: MeetingUser[];
  viewedUserIds: Set<string>;
  editingUserId: string | null;
  currentUserId?: string;
  draftSlots: Set<string>;
  onApplySlots: (slotKeys: string[], mode: DragMode) => void;
  isPhone?: boolean;
  allowedSlots?: Set<string>;
  selectionOnly?: boolean;
  hideHint?: boolean;
  bestIntersectionSlotKeys?: Set<string>;
  hoveredSlotKey?: string | null;
  onHoveredSlotKeyChange?: (slotKey: string | null) => void;
  intervalSelectionMode?: boolean;
  intervalSelectionSlots?: Set<string>;
  onIntervalSelectionSlotsChange?: (slotKeys: string[]) => void;
  onIntervalSelectionEnd?: (slotKeys: string[]) => void;
  selectedMeetingSlotKeys?: Set<string>;
  showCalendarOverlay?: boolean;
  calendarSlotEvents?: Map<string, string[]>;
  calendarConflictSlotKeys?: Set<string>;
}) {
  const daysPerPage = isPhone ? 3 : 7;
  const [dateOffset, setDateOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<DragMode>("add");
  const visitedSlotsRef = useRef(new Set<string>());
  const lastVisitedSlotKeyRef = useRef<string | null>(null);
  const allowedSlotsRef = useRef(allowedSlots);
  allowedSlotsRef.current = allowedSlots;

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTouchRef = useRef<{
    x: number;
    y: number;
    dateId: string;
    time: string;
    pointerId: number;
    isInterval: boolean;
  } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const clearPendingLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingTouchRef.current = null;
  }, []);

  const visibleDateIdsRef = useRef<string[]>([]);
  const timeSlotsRef = useRef(timeSlots);
  timeSlotsRef.current = timeSlots;

  const onApplySlotsRef = useRef(onApplySlots);
  onApplySlotsRef.current = onApplySlots;

  const onIntervalSelectionSlotsChangeRef = useRef(
    onIntervalSelectionSlotsChange,
  );
  onIntervalSelectionSlotsChangeRef.current = onIntervalSelectionSlotsChange;

  const onIntervalSelectionEndRef = useRef(onIntervalSelectionEnd);
  onIntervalSelectionEndRef.current = onIntervalSelectionEnd;

  const intervalSelectionSlotsRef = useRef(intervalSelectionSlots);
  intervalSelectionSlotsRef.current = intervalSelectionSlots;

  const intervalAnchorDateRef = useRef<string | null>(null);
  const intervalDragStartRef = useRef<string | null>(null);

  const isEditing = editingUserId !== null;
  const showEditingVisual = selectionOnly || isEditing;
  const highlightBestIntersection =
    !showEditingVisual &&
    !!bestIntersectionSlotKeys &&
    bestIntersectionSlotKeys.size > 0;

  const mySlots = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return users.find((user) => user.id === currentUserId)?.slots ?? null;
  }, [users, currentUserId]);

  const visibleDates = dates.slice(dateOffset, dateOffset + daysPerPage);
  visibleDateIdsRef.current = visibleDates.map((date) => date.id);
  const todayDateId = new Date().toLocaleDateString("en-CA");
  const hasPrevPage = dateOffset > 0;
  const hasNextPage = dateOffset + daysPerPage < dates.length;
  const showPagination = dates.length > daysPerPage;

  useEffect(() => {
    setDateOffset(0);
  }, [dates.length]);

  useEffect(() => {
    if (selectionOnly) {
      onHoveredSlotKeyChange?.(null);
      return;
    }

    if (isEditing && !showCalendarOverlay) {
      onHoveredSlotKeyChange?.(null);
    }
  }, [isEditing, onHoveredSlotKeyChange, selectionOnly, showCalendarOverlay]);

  function isSlotAllowed(dateId: string, time: string) {
    if (!allowedSlots) {
      return true;
    }

    return allowedSlots.has(getSlotKey(dateId, time));
  }

  function getAvailableCount(dateId: string, time: string) {
    if (selectionOnly) {
      return 0;
    }

    return countExplicitSlotAvailability(
      users,
      viewedUserIds,
      getSlotKey(dateId, time),
      editingUserId,
      draftSlots,
    );
  }

  let maxCount = 1;

  if (!selectionOnly) {
    for (const date of dates) {
      for (const time of timeSlots) {
        maxCount = Math.max(maxCount, getAvailableCount(date.id, time));
      }
    }
  }

  function handleSlotMouseEnter(slotKey: string, dateId: string, time: string) {
    if (isDraggingRef.current || selectionOnly) {
      return;
    }

    if (isEditing) {
      if (!showCalendarOverlay) {
        return;
      }

      onHoveredSlotKeyChange?.(slotKey);
      return;
    }

    if (
      highlightBestIntersection &&
      isSlotAllowed(dateId, time) &&
      bestIntersectionSlotKeys &&
      !bestIntersectionSlotKeys.has(slotKey)
    ) {
      return;
    }

    onHoveredSlotKeyChange?.(slotKey);
  }

  function handleGridMouseLeave() {
    if (selectionOnly) {
      return;
    }

    if (isEditing && !showCalendarOverlay) {
      return;
    }

    onHoveredSlotKeyChange?.(null);
  }

  function getIntervalSlotKeysBetween(fromSlotKey: string, toSlotKey: string) {
    const anchorDateId = intervalAnchorDateRef.current;

    if (!anchorDateId) {
      return [toSlotKey];
    }

    return getSlotKeysBetween(
      fromSlotKey,
      toSlotKey,
      visibleDateIdsRef.current,
      timeSlotsRef.current,
    ).filter((slotKey) => parseSlotKey(slotKey).dateId === anchorDateId);
  }

  function isEditingUserSlot(dateId: string, time: string) {
    if (!isEditing) {
      return false;
    }

    return draftSlots.has(getSlotKey(dateId, time));
  }

  const gridRef = useRef<HTMLDivElement>(null);

  function capturePointer(pointerId: number) {
    try {
      gridRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer may already be released; ignore.
    }
  }

  function beginIntervalDrag(dateId: string, time: string, pointerId: number) {
    capturePointer(pointerId);

    const slotKey = getSlotKey(dateId, time);
    intervalAnchorDateRef.current = dateId;
    intervalDragStartRef.current = slotKey;
    isDraggingRef.current = true;
    onIntervalSelectionSlotsChangeRef.current?.([slotKey]);
  }

  function beginEditingDrag(dateId: string, time: string, pointerId: number) {
    capturePointer(pointerId);

    const slotKey = getSlotKey(dateId, time);
    dragModeRef.current = draftSlots.has(slotKey) ? "remove" : "add";
    isDraggingRef.current = true;
    visitedSlotsRef.current = new Set([slotKey]);
    lastVisitedSlotKeyRef.current = slotKey;
    onApplySlotsRef.current([slotKey], dragModeRef.current);
  }

  function handleSlotPointerDown(
    dateId: string,
    time: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const isInterval = intervalSelectionMode;

    if (isInterval ? !isSlotAllowed(dateId, time) : !editingUserId) {
      return;
    }

    if (!isInterval && !isSlotAllowed(dateId, time)) {
      return;
    }

    // Touch: arm a long-press. Don't preventDefault/capture yet so a normal
    // swipe keeps scrolling the page; selection begins only on hold.
    if (event.pointerType === "touch") {
      clearPendingLongPress();
      pendingTouchRef.current = {
        x: event.clientX,
        y: event.clientY,
        dateId,
        time,
        pointerId: event.pointerId,
        isInterval,
      };

      longPressTimerRef.current = setTimeout(() => {
        const pending = pendingTouchRef.current;
        pendingTouchRef.current = null;
        longPressTimerRef.current = null;

        if (!pending) {
          return;
        }

        setIsTouchDragging(true);

        if (pending.isInterval) {
          beginIntervalDrag(pending.dateId, pending.time, pending.pointerId);
        } else {
          beginEditingDrag(pending.dateId, pending.time, pending.pointerId);
        }
      }, LONG_PRESS_MS);
      return;
    }

    // Mouse / pen: start immediately.
    event.preventDefault();

    if (isInterval) {
      beginIntervalDrag(dateId, time, event.pointerId);
    } else {
      beginEditingDrag(dateId, time, event.pointerId);
    }
  }

  function handleSlotTap(slotKey: string) {
    // Phone-only: tapping a slot in view mode reveals who is available there.
    if (
      !isPhone ||
      selectionOnly ||
      isEditing ||
      intervalSelectionMode ||
      isDraggingRef.current
    ) {
      return;
    }

    onHoveredSlotKeyChange?.(hoveredSlotKey === slotKey ? null : slotKey);
  }

  function collectDragSlotKeys(slotKeys: string[]) {
    const applicableSlotKeys: string[] = [];

    for (const slotKey of slotKeys) {
      if (visitedSlotsRef.current.has(slotKey)) {
        continue;
      }

      const { dateId, time } = parseSlotKey(slotKey);
      const slotAllowed =
        !allowedSlotsRef.current ||
        allowedSlotsRef.current.has(getSlotKey(dateId, time));

      if (!slotAllowed) {
        continue;
      }

      visitedSlotsRef.current.add(slotKey);
      applicableSlotKeys.push(slotKey);
    }

    return applicableSlotKeys;
  }

  const getSlotKeyFromPoint = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const cell = element?.closest("[data-slot-key]");
    return cell?.getAttribute("data-slot-key") ?? null;
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      // Still waiting on a long-press: if the finger travels far enough it's a
      // scroll, so cancel the pending selection and let the page scroll.
      const pending = pendingTouchRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const distance = Math.hypot(
          event.clientX - pending.x,
          event.clientY - pending.y,
        );

        if (distance > TOUCH_MOVE_CANCEL_PX) {
          clearPendingLongPress();
        }

        return;
      }

      if (!isDraggingRef.current) {
        return;
      }

      event.preventDefault();

      const slotKey = getSlotKeyFromPoint(event.clientX, event.clientY);

      if (!slotKey) {
        return;
      }

      if (intervalDragStartRef.current) {
        const dragStart = intervalDragStartRef.current;

        if (slotKey === dragStart) {
          onIntervalSelectionSlotsChangeRef.current?.([dragStart]);
          return;
        }

        onIntervalSelectionSlotsChangeRef.current?.(
          getIntervalSlotKeysBetween(dragStart, slotKey),
        );
        return;
      }

      if (!editingUserId) {
        return;
      }

      const lastSlotKey = lastVisitedSlotKeyRef.current;

      if (!lastSlotKey) {
        lastVisitedSlotKeyRef.current = slotKey;
        const applicableSlotKeys = collectDragSlotKeys([slotKey]);

        if (applicableSlotKeys.length > 0) {
          onApplySlotsRef.current(applicableSlotKeys, dragModeRef.current);
        }

        return;
      }

      if (slotKey === lastSlotKey) {
        return;
      }

      const slotsInPath = getSlotKeysBetween(
        lastSlotKey,
        slotKey,
        visibleDateIdsRef.current,
        timeSlotsRef.current,
      );
      const applicableSlotKeys = collectDragSlotKeys(slotsInPath);

      if (applicableSlotKeys.length > 0) {
        onApplySlotsRef.current(applicableSlotKeys, dragModeRef.current);
      }

      lastVisitedSlotKeyRef.current = slotKey;
    }

    function handlePointerUp() {
      clearPendingLongPress();

      if (
        intervalDragStartRef.current &&
        intervalSelectionSlotsRef.current?.size
      ) {
        onIntervalSelectionEndRef.current?.([
          ...intervalSelectionSlotsRef.current,
        ]);
      }

      isDraggingRef.current = false;
      visitedSlotsRef.current.clear();
      lastVisitedSlotKeyRef.current = null;
      intervalAnchorDateRef.current = null;
      intervalDragStartRef.current = null;
      setIsTouchDragging(false);
    }

    // While an active touch selection is in progress, cancel scrolling so the
    // drag keeps painting slots instead of moving the page.
    function handleTouchMove(event: TouchEvent) {
      if (isDraggingRef.current && event.cancelable) {
        event.preventDefault();
      }
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [
    editingUserId,
    getSlotKeyFromPoint,
    intervalSelectionMode,
    clearPendingLongPress,
  ]);

  const gridTemplateColumns = isPhone
    ? `2.25rem repeat(${visibleDates.length}, minmax(0, 1fr))`
    : `3.5rem repeat(${visibleDates.length}, minmax(0, 1fr))`;

  function handlePrevPage() {
    setDateOffset((offset) => Math.max(0, offset - 1));
  }

  function handleNextPage() {
    setDateOffset((offset) => Math.min(dates.length - daysPerPage, offset + 1));
  }

  const fadeNonBestSlots =
    highlightBestIntersection &&
    !!bestIntersectionSlotKeys &&
    bestIntersectionSlotKeys.size > 0;

  const filledSlotKeys = useMemo(() => {
    const set = new Set<string>();

    for (const date of dates) {
      for (const time of timeSlots) {
        const slotKey = getSlotKey(date.id, time);

        if (allowedSlots && !allowedSlots.has(slotKey)) {
          continue;
        }

        if (intervalSelectionMode) {
          if (intervalSelectionSlots?.has(slotKey)) {
            set.add(slotKey);
          }
          continue;
        }

        if (showEditingVisual) {
          if (draftSlots.has(slotKey)) {
            set.add(slotKey);
          }
          continue;
        }

        if (fadeNonBestSlots) {
          if (bestIntersectionSlotKeys?.has(slotKey)) {
            set.add(slotKey);
          }
          continue;
        }

        if (
          countExplicitSlotAvailability(
            users,
            viewedUserIds,
            slotKey,
            editingUserId,
            draftSlots,
          ) > 0
        ) {
          set.add(slotKey);
        }
      }
    }

    return set;
  }, [
    dates,
    timeSlots,
    allowedSlots,
    intervalSelectionMode,
    intervalSelectionSlots,
    showEditingVisual,
    draftSlots,
    fadeNonBestSlots,
    bestIntersectionSlotKeys,
    users,
    viewedUserIds,
    editingUserId,
  ]);

  function getDateColumnGapClassName(dateIndex: number) {
    const date = dates[dateIndex];

    if (!date) {
      return "";
    }

    const gapBefore =
      dateIndex > 0 && !areConsecutiveDateIds(dates[dateIndex - 1].id, date.id);
    const gapAfter =
      dateIndex < dates.length - 1 &&
      !areConsecutiveDateIds(date.id, dates[dateIndex + 1].id);

    return cn(gapBefore && "ml-2", gapAfter && "mr-2");
  }

  function getDateColumnGapBorderClassName(dateIndex: number) {
    const date = dates[dateIndex];

    if (!date) {
      return "";
    }

    const gapBefore =
      dateIndex > 0 && !areConsecutiveDateIds(dates[dateIndex - 1].id, date.id);

    return gapBefore ? "border-l border-base-300" : "";
  }

  const gridContent = (
    <div
      ref={gridRef}
      onMouseLeave={handleGridMouseLeave}
      className={cn(
        "grid w-full min-w-0",
        !isEditing && !selectionOnly && "opacity-95",
      )}
      style={{
        gridTemplateColumns,
        // Only lock scrolling once a touch drag is actually underway; before
        // that the page must stay scrollable over the grid.
        touchAction: isTouchDragging ? "none" : undefined,
      }}
    >
      <div />
      {visibleDates.map((date, visibleIndex) => {
        const dateIndex = dateOffset + visibleIndex;
        const dateColumnGapClassName = getDateColumnGapClassName(dateIndex);
        const isToday = date.id === todayDateId;
        const dayNumber = Number(date.id.split("-")[2]);

        return (
          <div
            key={date.id}
            className={cn("pb-2 text-center", dateColumnGapClassName)}
          >
            <div className="flex items-center justify-center gap-1.5 text-base font-medium">
              <span>{date.weekDay}</span>
              <span
                className={cn(
                  "inline-flex min-w-6 items-center justify-center tabular-nums",
                  isToday &&
                    "bg-error text-error-content rounded-md px-1.5 py-0.5",
                )}
              >
                {dayNumber}
              </span>
            </div>
          </div>
        );
      })}

      {timeSlots.map((time, timeIndex) => (
        <div key={time} className="contents">
          <div
            className={cn(
              "text-base-content/80 flex h-7 items-start justify-end pr-1 text-sm md:h-8 md:pr-2",
              time.endsWith(":30") && "text-transparent",
            )}
          >
            <span className="-translate-y-1/2">{time}</span>
          </div>
          {visibleDates.map((date, visibleIndex) => {
            const dateIndex = dateOffset + visibleIndex;
            const dateColumnGapClassName = getDateColumnGapClassName(dateIndex);
            const dateColumnGapBorderClassName =
              getDateColumnGapBorderClassName(dateIndex);
            const slotKey = getSlotKey(date.id, time);
            const slotAllowed = isSlotAllowed(date.id, time);
            const availableCount = getAvailableCount(date.id, time);
            const isSelected = isEditingUserSlot(date.id, time);
            const isMySlot =
              !!mySlots && mySlots.has(slotKey) && !showEditingVisual;
            const isIntervalSelected =
              intervalSelectionSlots?.has(slotKey) ?? false;
            const isSelectedMeetingSlot =
              !intervalSelectionMode &&
              (selectedMeetingSlotKeys?.has(slotKey) ?? false);
            const isFilled = filledSlotKeys.has(slotKey);
            const prevTime = timeIndex > 0 ? timeSlots[timeIndex - 1] : null;
            const nextTime =
              timeIndex < timeSlots.length - 1
                ? timeSlots[timeIndex + 1]
                : null;
            const nextDate =
              visibleIndex < visibleDates.length - 1
                ? visibleDates[visibleIndex + 1]
                : null;
            const mergeUp =
              isFilled &&
              !!prevTime &&
              filledSlotKeys.has(getSlotKey(date.id, prevTime));
            const mergeRight =
              isFilled &&
              !!nextDate &&
              areConsecutiveDateIds(date.id, nextDate.id) &&
              filledSlotKeys.has(getSlotKey(nextDate.id, time));
            const mySlotAbove =
              !!mySlots &&
              !!prevTime &&
              mySlots.has(getSlotKey(date.id, prevTime));
            const mySlotBelow =
              !!mySlots &&
              !!nextTime &&
              mySlots.has(getSlotKey(date.id, nextTime));
            const selectedMeetingSlotAbove =
              !!selectedMeetingSlotKeys &&
              !!prevTime &&
              selectedMeetingSlotKeys.has(getSlotKey(date.id, prevTime));
            const selectedMeetingSlotBelow =
              !!selectedMeetingSlotKeys &&
              !!nextTime &&
              selectedMeetingSlotKeys.has(getSlotKey(date.id, nextTime));
            const intervalSelectionAbove =
              isIntervalSelected &&
              !!prevTime &&
              intervalSelectionSlots?.has(getSlotKey(date.id, prevTime));
            const intervalSelectionBelow =
              isIntervalSelected &&
              !!nextTime &&
              intervalSelectionSlots?.has(getSlotKey(date.id, nextTime));
            const meetingTimeOverlapsAvailability =
              (isSelectedMeetingSlot || isIntervalSelected) &&
              !showEditingVisual &&
              availableCount > 0;
            const calendarEventTitles =
              showCalendarOverlay && calendarSlotEvents?.has(slotKey)
                ? calendarSlotEvents.get(slotKey)
                : undefined;
            const hasCalendarEvent = !!calendarEventTitles?.length;
            const calendarEventLabel =
              calendarEventTitles && calendarEventTitles.length > 1
                ? `${calendarEventTitles[0]} +${calendarEventTitles.length - 1}`
                : (calendarEventTitles?.[0] ?? "");
            const hasCalendarConflict =
              isSelected &&
              !!calendarConflictSlotKeys?.has(slotKey) &&
              hasCalendarEvent;
            const isBestIntersection =
              fadeNonBestSlots && bestIntersectionSlotKeys.has(slotKey);
            const isFilteredOut =
              fadeNonBestSlots && slotAllowed && !isBestIntersection;
            const isFullSlot =
              slotAllowed &&
              !showEditingVisual &&
              !isFilteredOut &&
              availableCount > 0 &&
              availableCount >= maxCount;
            const isHovered = hoveredSlotKey === slotKey;
            const showHoverRing =
              isHovered &&
              (!fadeNonBestSlots || isBestIntersection || !slotAllowed);
            const showFullSlotHover = showHoverRing && isFullSlot;
            const showPartialSlotHover = showHoverRing && !isFullSlot;
            const showHeatmapFill =
              slotAllowed && !showEditingVisual && !isFilteredOut;
            const heatmapAppearance = showHeatmapFill
              ? highlightBestIntersection
                ? getSlotHeatmapAppearanceColorblindSafe(
                    availableCount,
                    maxCount,
                  )
                : getSlotHeatmapAppearance(availableCount, maxCount)
              : undefined;

            return (
              <button
                key={slotKey}
                type="button"
                data-slot-key={slotKey}
                style={heatmapAppearance?.style}
                className={cn(
                  "border-base-300 relative h-7 md:h-8",
                  dateColumnGapClassName,
                  dateColumnGapBorderClassName,
                  visibleIndex === 0 && "border-l",
                  mergeUp
                    ? "border-t-transparent"
                    : cn(
                        "border-t",
                        time.endsWith(":00") ? "border-solid" : "border-dashed",
                      ),
                  mergeRight ? "border-r-transparent" : "border-r",
                  !slotAllowed &&
                    "bg-base-200/80 cursor-not-allowed opacity-40",
                  slotAllowed &&
                    (showEditingVisual
                      ? isSelected
                        ? "bg-primary text-primary-content"
                        : "bg-base-100"
                      : isFilteredOut
                        ? cn(
                            "bg-base-100",
                            !intervalSelectionMode && "pointer-events-none",
                          )
                        : heatmapAppearance?.className),
                  hasCalendarEvent &&
                    "bg-[repeating-linear-gradient(-45deg,color-mix(in_oklch,var(--color-accent)_24%,transparent),color-mix(in_oklch,var(--color-accent)_24%,transparent)_8px,transparent_8px,transparent_16px)]",
                  isSelected &&
                    hasCalendarConflict &&
                    "shadow-[inset_0_0_0_2px_var(--color-warning)]",
                  showPartialSlotHover &&
                    !isIntervalSelected &&
                    "ring-primary shadow-[inset_0_0_0_2px_var(--color-primary)]",
                  showFullSlotHover &&
                    !isIntervalSelected &&
                    "shadow-[inset_0_0_0_2px_var(--color-base-300)]/80",
                  (showEditingVisual || intervalSelectionMode) &&
                    slotAllowed &&
                    "select-none",
                  (isEditing || intervalSelectionMode) && slotAllowed
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
                title={
                  !slotAllowed
                    ? `${date.monthDay}, ${time}: not available for this meeting`
                    : isIntervalSelected
                      ? `${date.monthDay}, ${time}: selecting meeting time`
                      : isSelectedMeetingSlot
                        ? `${date.monthDay}, ${time}: selected meeting time`
                        : calendarEventTitles?.length
                          ? `${date.monthDay}, ${time}: ${availableCount} available · ${calendarEventTitles.join(", ")}`
                          : `${date.monthDay}, ${time}: ${availableCount} available`
                }
                onMouseEnter={() =>
                  handleSlotMouseEnter(slotKey, date.id, time)
                }
                onPointerDown={(event) =>
                  handleSlotPointerDown(date.id, time, event)
                }
                onClick={() => handleSlotTap(slotKey)}
              >
                {hasCalendarEvent && (
                  <span className="text-base-content/80 pointer-events-none absolute inset-0 flex items-center justify-center truncate px-0.5 text-center text-[10px] leading-none md:text-[11px] dark:text-[#f5f0d8]">
                    {calendarEventLabel}
                  </span>
                )}
                {isMySlot && !isIntervalSelected && (
                  <span
                    className={cn(
                      "border-l-primary border-r-primary pointer-events-none absolute inset-0 border-r-2 border-l-2",
                      !mySlotAbove && "border-t-primary border-t-2",
                      !mySlotBelow && "border-b-primary border-b-2",
                    )}
                  />
                )}
                {isSelectedMeetingSlot && !isIntervalSelected && (
                  <span
                    className={getMeetingTimeOverlayClassName({
                      continuesAbove: !!selectedMeetingSlotAbove,
                      continuesBelow: !!selectedMeetingSlotBelow,
                      overlapsAvailability: meetingTimeOverlapsAvailability,
                    })}
                  />
                )}
                {isIntervalSelected && (
                  <span
                    className={getMeetingTimeOverlayClassName({
                      continuesAbove: !!intervalSelectionAbove,
                      continuesBelow: !!intervalSelectionBelow,
                      overlapsAvailability: meetingTimeOverlapsAvailability,
                    })}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      {showPagination && isPhone && (
        <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
          <div className="text-sm font-medium">
            {visibleDates[0]?.monthDay} -{" "}
            {visibleDates[visibleDates.length - 1]?.monthDay}
          </div>
          {(hasPrevPage || hasNextPage) && (
            <div className="flex gap-2">
              {hasPrevPage && (
                <DateNavigationButton
                  direction="prev"
                  disabled={false}
                  onClick={handlePrevPage}
                />
              )}
              {hasNextPage && (
                <DateNavigationButton
                  direction="next"
                  disabled={false}
                  onClick={handleNextPage}
                />
              )}
            </div>
          )}
        </div>
      )}

      {!hideHint && intervalSelectionMode && (
        <p className="text-base-content/60 mb-3 text-sm">
          Drag on the grid to select the meeting time.
        </p>
      )}

      {!hideHint && isEditing && !intervalSelectionMode && (
        <p className="text-base-content/60 mb-3 text-sm">
          Click timeslots on the grid to mark your availability.
        </p>
      )}

      <div className="w-full min-w-0">
        {showPagination && !isPhone ? (
          <div className="flex items-start gap-2">
            {hasPrevPage && (
              <div className="hidden shrink-0 pt-8 md:block">
                <DateNavigationButton
                  direction="prev"
                  disabled={false}
                  onClick={handlePrevPage}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">{gridContent}</div>
            {hasNextPage && (
              <div className="hidden shrink-0 pt-8 md:block">
                <DateNavigationButton
                  direction="next"
                  disabled={false}
                  onClick={handleNextPage}
                />
              </div>
            )}
          </div>
        ) : (
          gridContent
        )}
      </div>

      {!selectionOnly && (
        <div className="text-base-content/70 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-primary/50 border-base-300 h-3 w-5 rounded-sm border" />
            Participant availability
          </span>
          {currentUserId && (
            <span className="inline-flex items-center gap-1.5">
              <span className="border-primary h-3 w-5 rounded-sm border-2" />
              Your timeslots
            </span>
          )}
          {(selectedMeetingSlotKeys?.size || intervalSelectionMode) && (
            <span className="inline-flex items-center gap-1.5">
              <span className="border-secondary bg-secondary/15 h-3 w-5 rounded-sm border-2" />
              Chosen meeting time
            </span>
          )}
        </div>
      )}
    </div>
  );
}
