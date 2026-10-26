import type { SchemaTermBlock } from "@/api/schedule-assistant/types.ts";
import { cn } from "@/lib/ui/cn";
import { blockForWeekBoundary } from "./timetableBlocks.ts";
import { formatDisplayDate, type WeekRange } from "./timetableViewerModel.ts";

export function TimetableBlockNavigation({
  blocks,
  selectedBlockId,
  onBlockChange,
  weeks,
  weekIndex,
  onWeekChange,
}: {
  blocks: SchemaTermBlock[];
  selectedBlockId: string;
  onBlockChange: (id: string) => void;
  weeks: WeekRange[];
  weekIndex: number;
  onWeekChange: (index: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={cn(
            "btn btn-xs",
            selectedBlockId === "all" ? "btn-primary" : "btn-ghost",
          )}
          onClick={() => onBlockChange("all")}
        >
          Все блоки
        </button>
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            className={cn(
              "btn btn-xs",
              selectedBlockId === block.id ? "btn-primary" : "btn-ghost",
            )}
            title={`${formatDisplayDate(block.start_date)}–${formatDisplayDate(block.end_date)}`}
            onClick={() => onBlockChange(block.id)}
          >
            {block.name}
          </button>
        ))}
      </div>
      <div className="flex max-w-full items-center gap-0.5 overflow-x-auto py-1">
        {weeks.map((week, index) => {
          const boundaries = blockForWeekBoundary(blocks, week);
          return (
            <button
              key={week.key}
              type="button"
              title={`Неделя ${index + 1}: ${formatDisplayDate(week.start)}–${formatDisplayDate(week.end)}${boundaries.length ? ` · Начало: ${boundaries.map((block) => block.name).join(", ")}` : ""}`}
              className={cn(
                "min-w-5 shrink-0 rounded px-1 py-0.5 text-[10px]",
                index === weekIndex
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/60",
                boundaries.length > 0 && "border-primary border-l-2",
              )}
              onClick={() => onWeekChange(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
