import { cn } from "@/lib/ui/cn";
import { formatHour, parseHour, TimeRangeSelection } from "../utils/dates.ts";

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

function TimePicker({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <select
      className={cn(
        "bg-base-200 text-base-content focus:border-base-300 focus:bg-base-100 w-28 cursor-pointer rounded-lg border border-transparent px-3 py-1.5 text-center transition-colors focus:outline-none",
        disabled && "cursor-not-allowed opacity-50",
      )}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {hour === 24 ? "00:00" : `${hour.toString().padStart(2, "0")}:00`}
        </option>
      ))}
    </select>
  );
}

export function TimeRange({
  className,
  disabled,
  defaultTimeValue,
  setValueCallback,
}: {
  className?: string;
  disabled?: boolean;
  defaultTimeValue?: TimeRangeSelection;
  setValueCallback: (value: TimeRangeSelection) => void;
}) {
  const startHour = parseHour(defaultTimeValue?.start ?? "09:00");
  const endHour = parseHour(defaultTimeValue?.end ?? "17:00");

  function updateCallback(start: number, end: number) {
    setValueCallback({
      start: formatHour(start),
      end: formatHour(end),
    });
  }

  function handleStartTimeChange(newStart: number) {
    if (newStart === 24) {
      return;
    }

    updateCallback(newStart, newStart >= endHour ? newStart + 1 : endHour);
  }

  function handleEndTimeChange(newEnd: number) {
    if (newEnd === 0) {
      return;
    }

    updateCallback(newEnd <= startHour ? newEnd - 1 : startHour, newEnd);
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="icon-[material-symbols--schedule-outline] text-base-content/70 text-xl" />
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          disabled && "opacity-50",
        )}
      >
        <span className="text-base-content/60 text-sm">from</span>
        <TimePicker
          value={startHour}
          disabled={disabled}
          onChange={handleStartTimeChange}
        />
        <span className="text-base-content/60 text-sm">to</span>
        <TimePicker
          value={endHour}
          disabled={disabled}
          onChange={handleEndTimeChange}
        />
      </div>
    </div>
  );
}
