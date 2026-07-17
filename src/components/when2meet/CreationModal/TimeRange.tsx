import { cn } from "@/lib/ui/cn";
import { formatHour, parseHour, TimeRangeSelection } from "../utils/dates.ts";

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

function TimePicker({
  value,
  disabled,
  onChange,
  className,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <select
      className={cn(
        "select select-bordered select-sm bg-base-100 h-9 w-full min-w-0",
        "text-base-content text-sm font-medium tabular-nums",
        "hover:border-base-content/25 focus:border-primary focus:outline-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {hour === 24 ? "24:00" : `${hour.toString().padStart(2, "0")}:00`}
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
      // A midnight end represents the end of the day (24:00), not 00:00.
      // Keep it as "24:00" so the range stays valid (e.g. 08:00–24:00).
      end: end === 24 ? "24:00" : formatHour(end),
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
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "bg-base-150 flex items-center gap-2 rounded-lg",
          disabled && "opacity-50",
        )}
      >
        <TimePicker
          value={startHour}
          disabled={disabled}
          onChange={handleStartTimeChange}
          className="flex-1"
        />
        <span
          className={cn(
            "icon-[material-symbols--arrow-forward] shrink-0 text-lg",
            disabled ? "text-base-content/40" : "text-base-content/50",
          )}
        />
        <TimePicker
          value={endHour}
          disabled={disabled}
          onChange={handleEndTimeChange}
          className="flex-1"
        />
      </div>
    </div>
  );
}
