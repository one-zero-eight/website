import type {
  SchemaInstructorSlotPreferenceEntry,
  SchemaTermConfig,
} from "@/api/schedule-assistant/types.ts";
import { InstructorSlotPreferenceLevel } from "@/api/schedule-assistant/types.ts";
import {
  normalizeTermWeekdays,
  termWeekdayKeyToWeekday,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { memo, useEffect, useMemo, useRef } from "react";

const CELL_HEX: Record<string, string> = {
  neutral: "#c9cdd4",
  [InstructorSlotPreferenceLevel.preferred]: "#86efac",
  [InstructorSlotPreferenceLevel.discouraged]: "#fcd34d",
  [InstructorSlotPreferenceLevel.banned]: "#f87171",
};

const CELL_PX = 6;
const GAP_PX = 1;

function normalizeStartTime(value: string): string {
  if (value.length >= 8) return value.slice(0, 8);
  if (value.length === 5) return `${value}:00`;
  return value;
}

export const InstructorPreferenceThumbnail = memo(
  function InstructorPreferenceThumbnail({
    term,
    preferences,
  }: {
    term: SchemaTermConfig | undefined;
    preferences: SchemaInstructorSlotPreferenceEntry[] | undefined;
  }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const grid = useMemo(() => {
      const weekdays = normalizeTermWeekdays(term?.days);
      const slots = term?.time_slots ?? [];
      if (!weekdays.length || !slots.length) return null;

      const levelByKey = new Map<string, string>();
      for (const entry of preferences ?? []) {
        levelByKey.set(
          `${entry.weekday}|${normalizeStartTime(entry.start_time)}`,
          entry.level,
        );
      }

      const levels: string[] = [];
      for (const slot of slots) {
        const normalized = normalizeStartTime(slot.start_time);
        for (const weekdayKey of weekdays) {
          const weekday = termWeekdayKeyToWeekday(weekdayKey);
          levels.push(levelByKey.get(`${weekday}|${normalized}`) ?? "neutral");
        }
      }

      const cols = weekdays.length;
      const rows = slots.length;
      return {
        cols,
        rows,
        levels,
        width: cols * CELL_PX + (cols - 1) * GAP_PX,
        height: rows * CELL_PX + (rows - 1) * GAP_PX,
      };
    }, [preferences, term?.days, term?.time_slots]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !grid) return;
      const { cols, rows, levels, width, height } = grid;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const level = levels[row * cols + col] ?? "neutral";
          ctx.fillStyle = CELL_HEX[level] ?? CELL_HEX.neutral;
          ctx.fillRect(
            col * (CELL_PX + GAP_PX),
            row * (CELL_PX + GAP_PX),
            CELL_PX,
            CELL_PX,
          );
        }
      }
    }, [grid]);

    if (!grid) {
      return (
        <div
          className="bg-base-200 w-14 shrink-0 self-center"
          style={{ height: 28 }}
          title="Нет сетки семестра"
        />
      );
    }

    const preferenceCount = preferences?.length ?? 0;
    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none shrink-0 self-center"
        style={{ width: grid.width, height: grid.height }}
        title={
          preferenceCount
            ? `Предпочтения: ${preferenceCount}`
            : "Нет предпочтений"
        }
      />
    );
  },
);
