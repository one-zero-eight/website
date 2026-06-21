import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/ui/cn";
import { CalendarItem, generateCalendarMonth } from "../utils/dates.ts";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_AHEAD = 6;

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

function buildMonthOptions() {
  const options: { year: number; month: number; label: string }[] = [];
  const date = new Date();
  date.setDate(1);

  for (let index = 0; index < MONTHS_AHEAD; index++) {
    options.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: `${date.getFullYear()}, ${date.toLocaleString("en", { month: "short" })}`,
    });
    date.setMonth(date.getMonth() + 1);
  }

  return options;
}

export function Calendar({
  className,
  onDatesChange,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  onDatesChange: (calendar: Set<string>) => void;
}) {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [monthIndex, setMonthIndex] = useState(0);
  const selectedDates = useRef<Set<string>>(new Set());
  const [calendar, setCalendar] = useState<CalendarItem[]>(() => {
    const firstMonth = monthOptions[0];
    return generateCalendarMonth(firstMonth.year, firstMonth.month);
  });

  const isDraggingRef = useRef(false);
  const isDeletingRef = useRef(false);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const calendarRef = useRef(calendar);
  calendarRef.current = calendar;
  const gridRef = useRef<HTMLDivElement>(null);

  const activeMonth = monthOptions[monthIndex];

  useEffect(() => {
    onDatesChange(selectedDates.current);
  }, [calendar, onDatesChange]);

  function toggleDateSelection(index: number, include: boolean) {
    setCalendar((previousCalendar) => {
      const nextCalendar = [...previousCalendar];
      const dateTimestamp =
        nextCalendar[index].date.toLocaleDateString("en-CA");

      if (include) {
        selectedDates.current.add(dateTimestamp);
      } else {
        selectedDates.current.delete(dateTimestamp);
      }

      nextCalendar[index] = { ...nextCalendar[index], selected: include };
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

    if (lastSelectedIndexRef.current === null) {
      toggleDateSelection(index, shouldInclude);
    } else {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);

      for (let i = start; i <= end; i++) {
        if (isSelectable(calendarRef.current[i])) {
          toggleDateSelection(i, shouldInclude);
        }
      }
    }

    lastSelectedIndexRef.current = index;
  }, []);

  function updateCalendar(year: number, month: number) {
    setCalendar(generateCalendarMonth(year, month, selectedDates.current));
  }

  function handleMonthIndexChange(nextIndex: number) {
    setMonthIndex(nextIndex);
    const option = monthOptions[nextIndex];
    updateCalendar(option.year, option.month);
  }

  function handlePreviousMonthClick() {
    if (monthIndex === 0) {
      return;
    }

    handleMonthIndexChange(monthIndex - 1);
  }

  function handleNextMonthClick() {
    if (monthIndex >= monthOptions.length - 1) {
      return;
    }

    handleMonthIndexChange(monthIndex + 1);
  }

  function getDayCellClasses(day: CalendarItem) {
    return cn(
      "flex h-10 w-full cursor-pointer items-center justify-center rounded-md transition-colors touch-manipulation",
      isSameDay(day.date, new Date()) &&
        !day.selected &&
        "border-primary border-2",
      (!isSelectable(day) || day.hidden) && "text-base-content/40",
      day.selected
        ? cn(
            "text-primary-content",
            day.hidden
              ? "bg-primary/80 hover:bg-primary"
              : "bg-primary hover:bg-primary/80",
          )
        : "hover:bg-base-300",
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
    <div className={cn("flex w-full flex-col", className)} {...props}>
      <div className="bg-base-200 mb-4 flex w-full items-center justify-between rounded-xl p-2">
        <button
          type="button"
          className="bg-base-100 text-base-content/70 hover:bg-base-300 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition"
          disabled={monthIndex === 0}
          onClick={handlePreviousMonthClick}
        >
          <span className="icon-[material-symbols--chevron-left] text-xl" />
        </button>

        <label className="text-base-content/70 relative flex min-w-0 items-center gap-1 text-sm font-semibold">
          <select
            className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold focus:outline-none"
            value={monthIndex}
            onChange={(event) =>
              handleMonthIndexChange(Number(event.target.value))
            }
          >
            {monthOptions.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="icon-[material-symbols--arrow-drop-down] pointer-events-none absolute right-0 text-xl" />
        </label>

        <button
          type="button"
          className="bg-base-100 text-base-content/70 hover:bg-base-300 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition"
          disabled={monthIndex >= monthOptions.length - 1}
          onClick={handleNextMonthClick}
        >
          <span className="icon-[material-symbols--chevron-right] text-xl" />
        </button>
      </div>

      <div
        ref={gridRef}
        className="relative grid w-full min-w-0 touch-none grid-cols-7 gap-x-1 gap-y-0.5 pb-1 select-none"
      >
        {WEEK_DAYS.map((day) => (
          <div key={day} className="mb-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}

        {calendar.map((item, index) => (
          <div
            key={`${activeMonth.year}-${activeMonth.month}-${item.date.toISOString()}`}
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
            className={getDayCellClasses(item)}
          >
            {item.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}
