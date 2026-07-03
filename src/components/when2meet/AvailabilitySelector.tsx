import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

function getBookingSelectionStyle(heatmapStyle?: CSSProperties): CSSProperties {
  return {
    ...heatmapStyle,
    backgroundImage:
      "linear-gradient(color-mix(in oklch, var(--color-secondary) 65%, transparent), color-mix(in oklch, var(--color-secondary) 65%, transparent))",
    boxShadow: "inset 0 0 0 2px var(--color-secondary)",
  };
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
  draftSlots,
  onApplySlots,
  isPhone = false,
  allowedSlots,
  selectionOnly = false,
  hideLegend = false,
  hideHint = false,
  bestIntersectionSlotKeys,
  bestIntersectionCount = 0,
  hoveredSlotKey = null,
  onHoveredSlotKeyChange,
  bookingMode = false,
  bookingSlots,
  onBookingSlotsChange,
  onBookingSelectionEnd,
}: {
  dates: MeetingDate[];
  timeSlots: string[];
  users: MeetingUser[];
  viewedUserIds: Set<string>;
  editingUserId: string | null;
  draftSlots: Set<string>;
  onApplySlots: (slotKeys: string[], mode: DragMode) => void;
  isPhone?: boolean;
  allowedSlots?: Set<string>;
  selectionOnly?: boolean;
  hideLegend?: boolean;
  hideHint?: boolean;
  bestIntersectionSlotKeys?: Set<string>;
  bestIntersectionCount?: number;
  hoveredSlotKey?: string | null;
  onHoveredSlotKeyChange?: (slotKey: string | null) => void;
  bookingMode?: boolean;
  bookingSlots?: Set<string>;
  onBookingSlotsChange?: (slotKeys: string[]) => void;
  onBookingSelectionEnd?: (slotKeys: string[]) => void;
}) {
  const daysPerPage = isPhone ? 3 : 7;
  const [dateOffset, setDateOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<DragMode>("add");
  const visitedSlotsRef = useRef(new Set<string>());
  const lastVisitedSlotKeyRef = useRef<string | null>(null);
  const allowedSlotsRef = useRef(allowedSlots);
  allowedSlotsRef.current = allowedSlots;

  const visibleDateIdsRef = useRef<string[]>([]);
  const timeSlotsRef = useRef(timeSlots);
  timeSlotsRef.current = timeSlots;

  const onApplySlotsRef = useRef(onApplySlots);
  onApplySlotsRef.current = onApplySlots;

  const onBookingSlotsChangeRef = useRef(onBookingSlotsChange);
  onBookingSlotsChangeRef.current = onBookingSlotsChange;

  const onBookingSelectionEndRef = useRef(onBookingSelectionEnd);
  onBookingSelectionEndRef.current = onBookingSelectionEnd;

  const bookingSlotsRef = useRef(bookingSlots);
  bookingSlotsRef.current = bookingSlots;

  const bookingAnchorDateRef = useRef<string | null>(null);
  const bookingDragStartRef = useRef<string | null>(null);

  const isEditing = editingUserId !== null;
  const showEditingVisual = selectionOnly || isEditing;
  const highlightBestIntersection =
    !showEditingVisual &&
    !!bestIntersectionSlotKeys &&
    bestIntersectionSlotKeys.size > 0;

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
    if (isEditing || selectionOnly) {
      onHoveredSlotKeyChange?.(null);
    }
  }, [isEditing, onHoveredSlotKeyChange, selectionOnly]);

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
    if (isDraggingRef.current || isEditing || selectionOnly) {
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
    if (isEditing || selectionOnly) {
      return;
    }

    onHoveredSlotKeyChange?.(null);
  }

  function getBookingSlotKeysBetween(fromSlotKey: string, toSlotKey: string) {
    const anchorDateId = bookingAnchorDateRef.current;

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

  function handleSlotPointerDown(
    dateId: string,
    time: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (bookingMode) {
      if (!isSlotAllowed(dateId, time)) {
        return;
      }

      event.preventDefault();
      gridRef.current?.setPointerCapture(event.pointerId);
      event.currentTarget.setPointerCapture(event.pointerId);

      const slotKey = getSlotKey(dateId, time);
      bookingAnchorDateRef.current = dateId;
      bookingDragStartRef.current = slotKey;
      isDraggingRef.current = true;
      onBookingSlotsChangeRef.current?.([slotKey]);
      return;
    }

    if (!editingUserId || !isSlotAllowed(dateId, time)) {
      return;
    }

    event.preventDefault();
    gridRef.current?.setPointerCapture(event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);

    const slotKey = getSlotKey(dateId, time);
    dragModeRef.current = draftSlots.has(slotKey) ? "remove" : "add";
    isDraggingRef.current = true;
    visitedSlotsRef.current = new Set([slotKey]);
    lastVisitedSlotKeyRef.current = slotKey;
    onApplySlotsRef.current([slotKey], dragModeRef.current);
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
      if (!isDraggingRef.current) {
        return;
      }

      event.preventDefault();

      const slotKey = getSlotKeyFromPoint(event.clientX, event.clientY);

      if (!slotKey) {
        return;
      }

      if (bookingDragStartRef.current) {
        const dragStart = bookingDragStartRef.current;

        if (slotKey === dragStart) {
          onBookingSlotsChangeRef.current?.([dragStart]);
          return;
        }

        onBookingSlotsChangeRef.current?.(
          getBookingSlotKeysBetween(dragStart, slotKey),
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
      if (bookingDragStartRef.current && bookingSlotsRef.current?.size) {
        onBookingSelectionEndRef.current?.([...bookingSlotsRef.current]);
      }

      isDraggingRef.current = false;
      visitedSlotsRef.current.clear();
      lastVisitedSlotKeyRef.current = null;
      bookingAnchorDateRef.current = null;
      bookingDragStartRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [editingUserId, getSlotKeyFromPoint, bookingMode]);

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

  const gridContent = (
    <div
      ref={gridRef}
      onMouseLeave={handleGridMouseLeave}
      className={cn(
        "grid w-full min-w-0",
        !isEditing && !selectionOnly && "opacity-95",
      )}
      style={{ gridTemplateColumns }}
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

      {timeSlots.map((time) => (
        <div key={time} className="contents">
          <div
            className={cn(
              "text-base-content/80 flex h-7 items-center justify-end pr-1 text-sm md:h-8 md:pr-2",
              time.endsWith(":30") && "text-transparent",
            )}
          >
            {time}
          </div>
          {visibleDates.map((date, visibleIndex) => {
            const dateIndex = dateOffset + visibleIndex;
            const dateColumnGapClassName = getDateColumnGapClassName(dateIndex);
            const slotKey = getSlotKey(date.id, time);
            const slotAllowed = isSlotAllowed(date.id, time);
            const availableCount = getAvailableCount(date.id, time);
            const isSelected = isEditingUserSlot(date.id, time);
            const isBookingSelected = bookingSlots?.has(slotKey) ?? false;
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
                style={
                  isBookingSelected
                    ? getBookingSelectionStyle(heatmapAppearance?.style)
                    : heatmapAppearance?.style
                }
                className={cn(
                  "border-base-300 relative h-7 border-t border-r border-dashed first:border-l md:h-8",
                  dateColumnGapClassName,
                  time.endsWith(":00") && "border-solid",
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
                            !bookingMode && "pointer-events-none",
                          )
                        : heatmapAppearance?.className),
                  showPartialSlotHover &&
                    !isBookingSelected &&
                    "ring-primary shadow-[inset_0_0_0_2px_var(--color-primary)]",
                  showFullSlotHover &&
                    !isBookingSelected &&
                    "shadow-[inset_0_0_0_2px_var(--color-base-300)]/80",
                  (showEditingVisual || bookingMode) &&
                    slotAllowed &&
                    "touch-none select-none",
                  (isEditing || bookingMode) && slotAllowed
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
                title={
                  !slotAllowed
                    ? `${date.monthDay}, ${time}: not available for this meeting`
                    : `${date.monthDay}, ${time}: ${availableCount} available`
                }
                onMouseEnter={() =>
                  handleSlotMouseEnter(slotKey, date.id, time)
                }
                onPointerDown={(event) =>
                  handleSlotPointerDown(date.id, time, event)
                }
              />
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

      {!hideHint && bookingMode && (
        <p className="text-base-content/60 mb-3 text-sm">
          Drag on the grid to select a time interval for booking.
        </p>
      )}

      {!hideHint && isEditing && !bookingMode && (
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

      {!hideLegend && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          {highlightBestIntersection ? (
            <>
              <div className="flex items-center gap-2">
                <div className="border-base-300 bg-primary/45 h-3 w-3 rounded border" />
                <span className="text-base-content/70">Fewer participants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary h-3 w-3 rounded" />
                <span className="text-base-content/70">More participants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="ring-primary bg-primary/70 h-3 w-3 rounded shadow-[inset_0_0_0_2px_var(--color-primary)]" />
                <span className="text-base-content/70">
                  {bestIntersectionCount > 0
                    ? `≥${bestIntersectionCount} participant${bestIntersectionCount === 1 ? "" : "s"}`
                    : "Matching times"}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-primary h-3 w-3 rounded" />
                <span className="text-base-content/70">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-base-100 border-base-300 h-3 w-3 rounded border border-dashed" />
                <span className="text-base-content/70">Empty</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
