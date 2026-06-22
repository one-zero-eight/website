import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/ui/cn";
import type { MeetingDate, MeetingUser } from "./types.ts";
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
  onApplySlot,
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
  onApplySlot: (dateId: string, time: string, mode: DragMode) => void;
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
  const visitedSlotsRef = useRef(new Set<string>());
  const allowedSlotsRef = useRef(allowedSlots);
  allowedSlotsRef.current = allowedSlots;

  const onApplySlotRef = useRef(onApplySlot);
  onApplySlotRef.current = onApplySlot;

  const viewedUsers = users.filter((user) => viewedUserIds.has(user.id));
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

  function getAvailableCount(dateId: string, time: string) {
    if (selectionOnly) {
      return 0;
    }

    const slotKey = getSlotKey(dateId, time);

    return viewedUsers.filter((user) => getDisplaySlots(user).has(slotKey))
      .length;
  }

  function getHeatmapTone(dateId: string, time: string) {
    const availableCount = getAvailableCount(dateId, time);

    if (availableCount > 0) {
      return getSlotTone(availableCount, maxCount);
    }

    return "bg-base-100 hover:bg-primary/10";
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
    onApplySlotRef.current(dateId, time, dragModeRef.current);
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

      onApplySlotRef.current(dateId, time, dragModeRef.current);
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
    : `3.5rem repeat(${visibleDates.length}, minmax(0, 1fr))`;

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
        <div key={date.id} className="pb-2 text-center">
          <div className="text-base-content/70 text-sm">{date.monthDay}</div>
          <div className="text-base font-medium">{date.weekDay}</div>
        </div>
      ))}

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
          {visibleDates.map((date) => {
            const slotKey = getSlotKey(date.id, time);
            const slotAllowed = isSlotAllowed(date.id, time);
            const availableCount = getAvailableCount(date.id, time);
            const isSelected = isEditingUserSlot(date.id, time);

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
                  isSelected && "ring-primary ring-2 ring-offset-0 ring-inset",
                  isEditing && slotAllowed
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
                title={`${date.monthDay}, ${time}: ${availableCount} available`}
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
          <div className="flex items-center gap-2">
            <div className="bg-base-100 border-base-300 h-3 w-3 rounded border border-dashed" />
            <span className="text-base-content/70">Empty</span>
          </div>
        </div>
      )}
    </div>
  );
}
