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
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

type CellLevel = InstructorSlotPreferenceLevel | "neutral";
type PaintMode = "set" | "clear";

const PALETTE: {
  level: InstructorSlotPreferenceLevel;
  label: string;
  cellClass: string;
  activeClass: string;
}[] = [
  {
    level: InstructorSlotPreferenceLevel.preferred,
    label: "Предпочтительно",
    cellClass: "bg-success/20 border-success/40",
    activeClass: "ring-success/60",
  },
  {
    level: InstructorSlotPreferenceLevel.discouraged,
    label: "Нежелательно",
    cellClass: "bg-warning/25 border-warning/50",
    activeClass: "ring-warning/60",
  },
  {
    level: InstructorSlotPreferenceLevel.banned,
    label: "Запрещено",
    cellClass: "bg-error/25 border-error/50",
    activeClass: "ring-error/60",
  },
];

const CELL_CLASS: Record<CellLevel, string> = {
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
): CellLevel {
  const normalized = normalizeStartTime(startTime);
  const match = preferences.find(
    (entry) =>
      entry.weekday === weekday &&
      normalizeStartTime(entry.start_time) === normalized,
  );
  return match?.level ?? "neutral";
}

function applyCell(
  preferences: SchemaInstructorSlotPreferenceEntry[],
  weekday: Weekday,
  startTime: string,
  mode: PaintMode,
  activeLevel: InstructorSlotPreferenceLevel,
): SchemaInstructorSlotPreferenceEntry[] {
  const normalized = normalizeStartTime(startTime);
  const filtered = preferences.filter(
    (entry) =>
      !(
        entry.weekday === weekday &&
        normalizeStartTime(entry.start_time) === normalized
      ),
  );
  if (mode === "clear") return filtered;
  return [...filtered, { weekday, start_time: normalized, level: activeLevel }];
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

  const [activeLevel, setActiveLevel] = useState(
    InstructorSlotPreferenceLevel.discouraged,
  );
  const [draft, setDraft] = useState(preferences);
  const draftRef = useRef(preferences);
  const paintRef = useRef<PaintMode | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draftRef.current = preferences;
    setDraft(preferences);
  }, [preferences]);

  useEffect(() => {
    function handlePointerUp() {
      if (!paintRef.current) return;
      paintRef.current = null;
      onChange(draftRef.current);
    }
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [onChange]);

  if (!weekdays.length || !slots.length) {
    return (
      <p className="text-base-content/70 text-xs">
        Задайте дни и слоты в настройках семестра.
      </p>
    );
  }

  function paintCell(
    weekdayKey: TermWeekdayKey,
    startTime: string,
    mode: PaintMode,
  ) {
    const weekday = termWeekdayKeyToWeekday(weekdayKey);
    const normalized = normalizeStartTime(startTime);
    const current = cellLevel(draftRef.current, weekday, normalized);
    const targetLevel = mode === "clear" ? "neutral" : activeLevel;
    if (current === targetLevel) return;
    const next = applyCell(
      draftRef.current,
      weekday,
      startTime,
      mode,
      activeLevel,
    );
    draftRef.current = next;
    setDraft(next);
  }

  function paintCellFromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const cell = target.closest("[data-pref-cell]");
    if (!cell) return;
    const weekdayKey = cell.getAttribute(
      "data-weekday",
    ) as TermWeekdayKey | null;
    const startTime = cell.getAttribute("data-time");
    const mode = paintRef.current;
    if (!weekdayKey || !startTime || !mode) return;
    paintCell(weekdayKey, startTime, mode);
  }

  function handleGridPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!paintRef.current) return;
    paintCellFromTarget(
      document.elementFromPoint(event.clientX, event.clientY),
    );
  }

  function handleCellPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    weekdayKey: TermWeekdayKey,
    startTime: string,
  ) {
    if (event.button === 2) {
      paintRef.current = "clear";
      gridRef.current?.setPointerCapture(event.pointerId);
      paintCell(weekdayKey, startTime, "clear");
      return;
    }
    if (event.button !== 0) return;
    paintRef.current = "set";
    gridRef.current?.setPointerCapture(event.pointerId);
    paintCell(weekdayKey, startTime, "set");
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((item) => (
          <button
            key={item.level}
            type="button"
            className={cn(
              "rounded-field h-7 border px-2 text-xs",
              item.cellClass,
              activeLevel === item.level && `ring-2 ${item.activeClass}`,
            )}
            onClick={() => setActiveLevel(item.level)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-base-content/60 text-[11px] leading-snug">
        ЛКМ — закрасить выбранным значением, протянуть для заливки. ПКМ —
        сбросить ячейку.
      </p>
      <div
        ref={gridRef}
        className="w-full min-w-0 select-none"
        onContextMenu={handleContextMenu}
        onPointerMove={handleGridPointerMove}
      >
        <div
          className="grid w-full gap-px"
          style={{
            gridTemplateColumns: `2.75rem repeat(${weekdays.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="bg-base-200" />
          {weekdays.map((weekdayKey) => (
            <div
              key={weekdayKey}
              className="text-base-content/70 bg-base-200 truncate px-0.5 text-center text-[10px] leading-tight font-medium"
            >
              {TERM_WEEKDAY_LABEL_RU[weekdayKey]}
            </div>
          ))}
          {slots.map((slot) => {
            const normalized = normalizeStartTime(slot.start_time);
            return (
              <div key={slot.start_time} className="contents">
                <div className="text-base-content/70 bg-base-200 flex items-center pr-1 text-[10px] leading-tight">
                  {normalized.slice(0, 5)}
                </div>
                {weekdays.map((weekdayKey) => {
                  const weekday = termWeekdayKeyToWeekday(weekdayKey);
                  const level = cellLevel(draft, weekday, normalized);
                  return (
                    <button
                      key={`${weekdayKey}-${slot.start_time}`}
                      type="button"
                      data-pref-cell
                      data-weekday={weekdayKey}
                      data-time={normalized}
                      className={cn(
                        "h-7 w-full min-w-0 touch-none border p-0",
                        CELL_CLASS[level],
                      )}
                      onPointerDown={(event) =>
                        handleCellPointerDown(event, weekdayKey, normalized)
                      }
                      onContextMenu={handleContextMenu}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
