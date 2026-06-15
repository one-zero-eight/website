import type {
  SchemaInstructorSlotPreferenceEntry,
  SchemaTermConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  InstructorSlotPreferenceLevel,
  Weekday,
} from "@/api/schedule-assistant/types.ts";
import {
  TERM_WEEKDAY_LABEL_RU,
  normalizeTermWeekdays,
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { cn } from "@/lib/ui/cn";

const PREFERENCE_CYCLE: ("neutral" | InstructorSlotPreferenceLevel)[] = [
  "neutral",
  InstructorSlotPreferenceLevel.preferred,
  InstructorSlotPreferenceLevel.discouraged,
  InstructorSlotPreferenceLevel.banned,
];

const CELL_CLASS: Record<string, string> = {
  neutral: "bg-base-100 border-base-300",
  preferred: "bg-success/20 border-success/40",
  discouraged: "bg-warning/25 border-warning/50",
  banned: "bg-error/25 border-error/50",
};

function normalizeStartTime(value: string): string {
  if (value.length >= 8) return value.slice(0, 8);
  if (value.length === 5) return `${value}:00`;
  return value;
}

function cellLevel(
  preferences: SchemaInstructorSlotPreferenceEntry[],
  weekday: Weekday,
  startTime: string,
): InstructorSlotPreferenceLevel | "neutral" {
  const normalized = normalizeStartTime(startTime);
  const match = preferences.find(
    (entry) =>
      entry.weekday === weekday &&
      normalizeStartTime(entry.start_time) === normalized,
  );
  return match?.level ?? "neutral";
}

export function InstructorPreferenceGrid({
  term,
  preferences,
  onChange,
}: {
  term: SchemaTermConfig | undefined;
  preferences: SchemaInstructorSlotPreferenceEntry[];
  onChange: (preferences: SchemaInstructorSlotPreferenceEntry[]) => void;
}) {
  const weekdays = normalizeTermWeekdays(term?.days);
  const slots = term?.time_slots ?? [];

  if (!weekdays.length || !slots.length) {
    return (
      <p className="text-base-content/70 text-xs">
        Задайте дни и слоты в настройках семестра.
      </p>
    );
  }

  function handleCycle(weekdayKey: TermWeekdayKey, startTime: string) {
    const weekday = termWeekdayKeyToWeekday(weekdayKey);
    const normalized = normalizeStartTime(startTime);
    const current = cellLevel(preferences, weekday, normalized);
    const currentIndex = PREFERENCE_CYCLE.indexOf(current);
    const next = PREFERENCE_CYCLE[(currentIndex + 1) % PREFERENCE_CYCLE.length];
    const filtered = preferences.filter(
      (entry) =>
        !(
          entry.weekday === weekday &&
          normalizeStartTime(entry.start_time) === normalized
        ),
    );
    if (next === "neutral") {
      onChange(filtered);
      return;
    }
    onChange([...filtered, { weekday, start_time: normalized, level: next }]);
  }

  return (
    <div className="@container/prefs overflow-x-auto">
      <div
        className="grid min-w-fit gap-1"
        style={{
          gridTemplateColumns: `2.5rem repeat(${slots.length}, minmax(2.75rem, 1fr))`,
        }}
      >
        <div />
        {slots.map((slot) => (
          <div
            key={slot.start_time}
            className="text-base-content/70 text-center text-[10px] leading-tight"
          >
            {normalizeStartTime(slot.start_time).slice(0, 5)}
          </div>
        ))}
        {weekdays.map((weekdayKey) => (
          <div key={weekdayKey} className="contents">
            <div className="text-base-content/70 flex items-center text-xs">
              {TERM_WEEKDAY_LABEL_RU[weekdayKey]}
            </div>
            {slots.map((slot) => {
              const weekday = termWeekdayKeyToWeekday(weekdayKey);
              const normalized = normalizeStartTime(slot.start_time);
              const level = cellLevel(preferences, weekday, normalized);
              return (
                <button
                  key={`${weekdayKey}-${slot.start_time}`}
                  type="button"
                  className={cn(
                    "btn h-7 min-h-0 rounded-sm border px-0",
                    CELL_CLASS[level],
                  )}
                  onClick={() => handleCycle(weekdayKey, normalized)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
