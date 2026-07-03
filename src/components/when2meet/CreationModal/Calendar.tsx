import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/ui/cn";
import { CalendarItem, generateCalendarMonth } from "../utils/dates.ts";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getFullYear() === secondDate.getFullYear()
  );
}

function isSelectable(item: CalendarItem) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return item.date >= today || isSameDay(item.date, today);
}

export function Calendar({
  className,
  onDatesChange,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  onDatesChange: (calendar: Set<string>) => void;
}) {
  const currentMonthRef = useRef(new Date());
  const selectedDates = useRef<Set<string>>(new Set());
  const [calendar, setCalendar] = useState<CalendarItem[]>(
    generateCalendarMonth(
      currentMonthRef.current.getFullYear(),
      currentMonthRef.current.getMonth(),
    ),
  );

  const isDraggingRef = useRef(false);
  const isDeletingRef = useRef(false);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const calendarRef = useRef(calendar);
  calendarRef.current = calendar;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onDatesChange(selectedDates.current);
  }, [calendar, onDatesChange]);

  function applyDateSelection(indices: number[], include: boolean) {
    setCalendar((previousCalendar) => {
      const nextCalendar = [...previousCalendar];
      let hasChanges = false;

      for (const index of indices) {
        const day = nextCalendar[index];

        if (!day || !isSelectable(day) || day.selected === include) {
          continue;
        }

        const dateTimestamp = day.date.toLocaleDateString("en-CA");

        if (include) {
          selectedDates.current.add(dateTimestamp);
        } else {
          selectedDates.current.delete(dateTimestamp);
        }

        nextCalendar[index] = { ...day, selected: include };
        hasChanges = true;
      }

      if (!hasChanges) {
        return previousCalendar;
      }

      return nextCalendar;
    });
  }

  const handleSelect = useCallback((index: number) => {
    if (!isDraggingRef.current) {
      return;
    }

    const day = calendarRef.current[index];

    if (!day || !isSelectable(day)) {
      return;
    }

    if (lastSelectedIndexRef.current === index) {
      return;
    }

    const shouldInclude = !isDeletingRef.current;
    const indices: number[] = [];

    if (lastSelectedIndexRef.current === null) {
      indices.push(index);
    } else {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);

      for (let currentIndex = start; currentIndex <= end; currentIndex++) {
        indices.push(currentIndex);
      }
    }

    applyDateSelection(indices, shouldInclude);
    lastSelectedIndexRef.current = index;
  }, []);

  function updateCalendar() {
    setCalendar(
      generateCalendarMonth(
        currentMonthRef.current.getFullYear(),
        currentMonthRef.current.getMonth(),
        selectedDates.current,
      ),
    );
  }

  function handlePreviousMonthClick() {
    currentMonthRef.current.setMonth(currentMonthRef.current.getMonth() - 1);
    updateCalendar();
  }

  function handleNextMonthClick() {
    const year = currentMonthRef.current.getFullYear();
    const month = currentMonthRef.current.getMonth();

    if (
      year === new Date().getFullYear() + 2 &&
      month === new Date().getMonth()
    ) {
      return;
    }

    currentMonthRef.current.setMonth(month + 1);
    updateCalendar();
  }

  function getDayCellClasses(index: number) {
    const day = calendar[index];

    return cn(
      "my-1 flex aspect-square cursor-pointer touch-none select-none items-center justify-center",
      isSameDay(day.date, new Date()) &&
        !day.selected &&
        "border-primary rounded-full border-2",
      (!isSelectable(day) || day.hidden) && "text-base-content/40",
      day.selected
        ? cn(
            "text-primary-content",
            day.hidden
              ? "bg-primary/80 hover:bg-primary"
              : "bg-primary hover:bg-primary/80",
          )
        : "hover:bg-base-300 rounded-full",
      day.selected &&
        ((index > 0 && !calendar[index - 1].selected) || index % 7 === 0) &&
        "rounded-l-full hover:rounded-l-full",
      day.selected &&
        ((index < calendar.length - 1 && !calendar[index + 1].selected) ||
          (index + 1) % 7 === 0) &&
        "rounded-r-full hover:rounded-r-full",
      day.hidden &&
        index < calendar.length - 1 &&
        calendar[index + 1].selected &&
        !calendar[index + 1].hidden &&
        "border-base-100 border-r-2",
      day.hidden &&
        index > 0 &&
        calendar[index - 1].selected &&
        !calendar[index - 1].hidden &&
        "border-base-100 border-l-2",
    );
  }

  function getCellIndexFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const cell = element?.closest("[data-index]");
    const indexAttribute = cell?.getAttribute("data-index");

    if (!indexAttribute) {
      return null;
    }

    return Number(indexAttribute);
  }

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current) {
        return;
      }

      event.preventDefault();

      const index = getCellIndexFromPoint(event.clientX, event.clientY);

      if (index === null) {
        return;
      }

      handleSelect(index);
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
      lastSelectedIndexRef.current = null;
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
  }, [handleSelect]);

  return (
    <div className={cn("flex flex-col items-center", className)} {...props}>
      <div className="bg-base-200 relative z-20 mb-4 flex w-full items-center justify-between rounded-full p-1.5">
        <button
          type="button"
          className="bg-base-100 text-base-content/70 hover:bg-base-300 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition"
          onClick={handlePreviousMonthClick}
        >
          <span className="icon-[material-symbols--chevron-left] text-xl" />
        </button>

        <div className="text-base-content/70 flex items-center text-sm font-semibold">
          <select
            className="relative z-30 h-7 cursor-pointer appearance-none bg-transparent pr-1 text-sm font-semibold hover:underline focus:z-50 focus:outline-none"
            value={currentMonthRef.current.getFullYear()}
            onChange={(event) => {
              currentMonthRef.current.setFullYear(Number(event.target.value));
              updateCalendar();
            }}
          >
            {[0, 1, 2].map((index) => {
              const year = new Date().getFullYear() + index;

              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
          <span>,&nbsp;</span>
          <span>
            {new Date(
              currentMonthRef.current.getFullYear(),
              currentMonthRef.current.getMonth(),
              1,
            ).toLocaleString("en", { month: "long" })}
          </span>
        </div>

        <button
          type="button"
          className="bg-base-100 text-base-content/70 hover:bg-base-300 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition"
          onClick={handleNextMonthClick}
        >
          <span className="icon-[material-symbols--chevron-right] text-xl" />
        </button>
      </div>

      <div
        ref={gridRef}
        className="relative z-0 grid w-full max-w-md min-w-0 grid-cols-7"
      >
        {WEEK_DAYS.map((day) => (
          <div key={day} className="mb-2 text-center text-sm font-semibold">
            {day}
          </div>
        ))}

        {calendar.map((item, index) => (
          <div
            key={item.date.toISOString()}
            data-index={index}
            onPointerDown={(event) => {
              if (!isSelectable(item)) {
                return;
              }

              event.preventDefault();
              gridRef.current?.setPointerCapture(event.pointerId);
              event.currentTarget.setPointerCapture(event.pointerId);
              isDraggingRef.current = true;
              isDeletingRef.current = calendar[index].selected;
              lastSelectedIndexRef.current = null;
              handleSelect(index);
            }}
            className={getDayCellClasses(index)}
          >
            {item.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}
