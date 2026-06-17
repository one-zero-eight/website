import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/ui/cn";
import type { AvailabilityType, MeetingDate, MeetingUser } from "./types.ts";
import { getSlotKey, getSlotTone, parseSlotKey } from "./utils/slots.ts";

type DragMode = "add" | "remove";

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
        "btn btn-circle btn-outline btn-sm shrink-0",
        disabled && "invisible",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className={cn(
          "text-xl",
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
  draftIfNeededSlots,
  onApplySlot,
  onAvailabilityTypeChange,
  availabilityType = "available",
  isPhone = false,
  allowedSlots,
  selectionOnly = false,
  hideLegend = false,
  hideHint = false,
}: {
  dates: MeetingDate[];
  timeSlots: string[];
  users: MeetingUser[];
  viewedUserIds: Set<string>;
  editingUserId: string | null;
  draftSlots: Set<string>;
  draftIfNeededSlots: Set<string>;
  onApplySlot: (
    dateId: string,
    time: string,
    mode: DragMode,
    type: AvailabilityType,
  ) => void;
  onAvailabilityTypeChange?: (type: AvailabilityType) => void;
  availabilityType?: AvailabilityType;
  isPhone?: boolean;
  allowedSlots?: Set<string>;
  selectionOnly?: boolean;
  hideLegend?: boolean;
  hideHint?: boolean;
}) {
  const daysPerPage = isPhone ? 3 : 7;
  const [dateOffset, setDateOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<DragMode>("add");
  const dragTypeRef = useRef<AvailabilityType>("available");
  const visitedSlotsRef = useRef(new Set<string>());
  const allowedSlotsRef = useRef(allowedSlots);
  allowedSlotsRef.current = allowedSlots;

  const onApplySlotRef = useRef(onApplySlot);
  onApplySlotRef.current = onApplySlot;

  const viewedUsers = users.filter((user) => viewedUserIds.has(user.id));
  const editingUser = users.find((user) => user.id === editingUserId);
  const maxCount = Math.max(1, viewedUsers.length);

  const visibleDates = dates.slice(dateOffset, dateOffset + daysPerPage);
  const hasPrevPage = dateOffset > 0;
  const hasNextPage = dateOffset + daysPerPage < dates.length;
  const showPagination = dates.length > daysPerPage;
  const isEditing = editingUserId !== null;

  useEffect(() => {
    setDateOffset(0);
  }, [dates.length]);

  function isSlotAllowed(dateId: string, time: string) {
    if (!allowedSlots) {
      return true;
    }

    return allowedSlots.has(getSlotKey(dateId, time));
  }

  function getDisplaySlots(user: MeetingUser) {
    if (user.id !== editingUserId) {
      return user.slots;
    }

    return draftSlots;
  }

  function getDisplayIfNeededSlots(user: MeetingUser) {
    if (user.id !== editingUserId) {
      return user.ifNeededSlots ?? new Set<string>();
    }

    return draftIfNeededSlots;
  }

  function getAvailableCount(dateId: string, time: string) {
    if (selectionOnly) {
      return 0;
    }

    const slotKey = getSlotKey(dateId, time);

    return viewedUsers.filter((user) => getDisplaySlots(user).has(slotKey))
      .length;
  }

  function getIfNeededCount(dateId: string, time: string) {
    if (selectionOnly) {
      return 0;
    }

    const slotKey = getSlotKey(dateId, time);

    return viewedUsers.filter(
      (user) =>
        getDisplayIfNeededSlots(user).has(slotKey) &&
        !getDisplaySlots(user).has(slotKey),
    ).length;
  }

  function getHeatmapTone(dateId: string, time: string) {
    const availableCount = getAvailableCount(dateId, time);
    const ifNeededCount = getIfNeededCount(dateId, time);

    if (availableCount > 0) {
      return getSlotTone(availableCount, maxCount, "available");
    }

    if (ifNeededCount > 0) {
      return getSlotTone(ifNeededCount, maxCount, "if_needed");
    }

    return "bg-base-100 hover:bg-primary/10";
  }

  function isEditingUserSlot(dateId: string, time: string) {
    if (!isEditing) {
      return false;
    }

    const slotKey = getSlotKey(dateId, time);
    const activeSet =
      availabilityType === "if_needed" ? draftIfNeededSlots : draftSlots;

    return activeSet.has(slotKey);
  }

  function isEditingUserIfNeededSlot(dateId: string, time: string) {
    if (!editingUser || availabilityType !== "available" || selectionOnly) {
      return false;
    }

    return draftIfNeededSlots.has(getSlotKey(dateId, time));
  }

  const gridRef = useRef<HTMLDivElement>(null);

  function handleSlotPointerDown(
    dateId: string,
    time: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!editingUserId || !isSlotAllowed(dateId, time)) {
      return;
    }

    event.preventDefault();
    gridRef.current?.setPointerCapture(event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);

    const slotKey = getSlotKey(dateId, time);
    const activeSet =
      availabilityType === "if_needed" ? draftIfNeededSlots : draftSlots;
    dragModeRef.current = activeSet.has(slotKey) ? "remove" : "add";
    dragTypeRef.current = availabilityType;
    isDraggingRef.current = true;
    visitedSlotsRef.current = new Set([slotKey]);
    onApplySlotRef.current(
      dateId,
      time,
      dragModeRef.current,
      dragTypeRef.current,
    );
  }

  const getSlotKeyFromPoint = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const cell = element?.closest("[data-slot-key]");
    return cell?.getAttribute("data-slot-key") ?? null;
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current || !editingUserId) {
        return;
      }

      event.preventDefault();

      const slotKey = getSlotKeyFromPoint(event.clientX, event.clientY);

      if (!slotKey || visitedSlotsRef.current.has(slotKey)) {
        return;
      }

      visitedSlotsRef.current.add(slotKey);
      const { dateId, time } = parseSlotKey(slotKey);
      const slotAllowed =
        !allowedSlotsRef.current ||
        allowedSlotsRef.current.has(getSlotKey(dateId, time));

      if (!slotAllowed) {
        return;
      }

      onApplySlotRef.current(
        dateId,
        time,
        dragModeRef.current,
        dragTypeRef.current,
      );
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
      visitedSlotsRef.current.clear();
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
  }, [editingUserId, getSlotKeyFromPoint]);

  const gridTemplateColumns = isPhone
    ? `2.25rem repeat(${visibleDates.length}, minmax(0, 1fr))`
    : `4.25rem repeat(${visibleDates.length}, minmax(0, 1fr))`;

  function handlePrevPage() {
    setDateOffset((offset) => Math.max(0, offset - 1));
  }

  function handleNextPage() {
    setDateOffset((offset) => Math.min(dates.length - daysPerPage, offset + 1));
  }

  const gridContent = (
    <div
      ref={gridRef}
      className={cn(
        "grid w-full min-w-0 touch-manipulation select-none",
        isEditing && "touch-none",
        !isEditing && !selectionOnly && "opacity-95",
      )}
      style={{ gridTemplateColumns }}
    >
      <div />
      {visibleDates.map((date) => (
        <div key={date.id} className="pb-2 text-center md:pb-3">
          <div className="text-base-content/70 text-xs md:text-base">
            {date.monthDay}
          </div>
          <div className="text-base font-medium md:text-3xl">
            {date.weekDay}
          </div>
        </div>
      ))}

      {timeSlots.map((time) => (
        <div key={time} className="contents">
          <div
            className={cn(
              "text-base-content/80 flex h-7 items-center justify-end pr-1 text-xs md:h-8 md:pr-2 md:text-xl",
              time.endsWith(":30") && "text-transparent",
            )}
          >
            {time}
          </div>
          {visibleDates.map((date) => {
            const slotKey = getSlotKey(date.id, time);
            const slotAllowed = isSlotAllowed(date.id, time);
            const availableCount = getAvailableCount(date.id, time);
            const ifNeededCount = getIfNeededCount(date.id, time);
            const isSelected = isEditingUserSlot(date.id, time);
            const isIfNeededSelected = isEditingUserIfNeededSlot(date.id, time);

            return (
              <button
                key={slotKey}
                type="button"
                data-slot-key={slotKey}
                className={cn(
                  "border-base-300 h-7 border-t border-r border-dashed transition-colors first:border-l md:h-8",
                  time.endsWith(":00") && "border-solid",
                  !slotAllowed &&
                    "bg-base-200/80 cursor-not-allowed opacity-40",
                  slotAllowed &&
                    (selectionOnly
                      ? isSelected
                        ? "bg-primary text-primary-content"
                        : "bg-base-100 hover:bg-primary/10"
                      : getHeatmapTone(date.id, time)),
                  isIfNeededSelected &&
                    !isSelected &&
                    "bg-warning/40 ring-warning ring-2 ring-inset",
                  isSelected && "ring-primary ring-2 ring-offset-0 ring-inset",
                  isEditing && slotAllowed
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
                title={`${date.monthDay}, ${time}: ${availableCount} available${ifNeededCount > 0 ? `, ${ifNeededCount} if needed` : ""}`}
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
        <div className="mb-3 flex items-center justify-between md:hidden">
          <div className="text-sm font-medium">
            {visibleDates[0]?.monthDay} -{" "}
            {visibleDates[visibleDates.length - 1]?.monthDay}
          </div>
          <div className="flex gap-2">
            <DateNavigationButton
              direction="prev"
              disabled={!hasPrevPage}
              onClick={handlePrevPage}
            />
            <DateNavigationButton
              direction="next"
              disabled={!hasNextPage}
              onClick={handleNextPage}
            />
          </div>
        </div>
      )}

      {isEditing && onAvailabilityTypeChange && !selectionOnly && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={cn(
              "btn btn-sm flex-1",
              availabilityType === "available"
                ? "btn-primary"
                : "btn-outline btn-primary/50",
            )}
            onClick={() => onAvailabilityTypeChange("available")}
          >
            <span className="bg-primary-content h-2.5 w-2.5 rounded-full" />
            Available
          </button>
          <button
            type="button"
            className={cn(
              "btn btn-sm flex-1",
              availabilityType === "if_needed"
                ? "btn-warning"
                : "btn-outline btn-warning/50",
            )}
            onClick={() => onAvailabilityTypeChange("if_needed")}
          >
            <span className="bg-warning-content h-2.5 w-2.5 rounded-full" />
            If needed
          </button>
        </div>
      )}

      {!isEditing && !hideHint && (
        <p className="text-base-content/60 mb-3 text-sm">
          Select a participant and click Edit timeslots to update availability.
        </p>
      )}

      <div className={cn("w-full min-w-0", isEditing && "touch-none")}>
        {showPagination && !isPhone ? (
          <div className="flex items-start gap-2">
            <div className="hidden shrink-0 pt-8 md:block">
              <DateNavigationButton
                direction="prev"
                disabled={!hasPrevPage}
                onClick={handlePrevPage}
              />
            </div>
            <div className="min-w-0 flex-1">{gridContent}</div>
            <div className="hidden shrink-0 pt-8 md:block">
              <DateNavigationButton
                direction="next"
                disabled={!hasNextPage}
                onClick={handleNextPage}
              />
            </div>
          </div>
        ) : (
          gridContent
        )}
      </div>

      {!hideLegend && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-3 w-3 rounded" />
            <span className="text-base-content/70">Available</span>
          </div>
          {!selectionOnly && (
            <div className="flex items-center gap-2">
              <div className="bg-warning h-3 w-3 rounded" />
              <span className="text-base-content/70">If needed</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-base-100 border-base-300 h-3 w-3 rounded border border-dashed" />
            <span className="text-base-content/70">Empty</span>
          </div>
        </div>
      )}
    </div>
  );
}
