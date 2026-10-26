import { cn } from "@/lib/ui/cn";
import type { SchemaTermBlock } from "@/api/schedule-assistant/types.ts";

export type BlockFilterValue = "all" | "semester" | (string & {});

export function BlockFilter({
  blocks,
  value,
  onChange,
}: {
  blocks: readonly SchemaTermBlock[];
  value: BlockFilterValue;
  onChange: (value: BlockFilterValue) => void;
}) {
  return (
    <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <span className="text-base-content/70">Блок</span>
      <select
        className={cn(
          "select select-bordered select-sm max-w-full",
          blocks.length === 0 && "text-base-content/70",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">Все</option>
        <option value="semester">Весь семестр</option>
        {[...blocks]
          .sort(
            (a, b) =>
              a.start_date.localeCompare(b.start_date) ||
              a.id.localeCompare(b.id),
          )
          .map((block, index) => (
            <option key={block.id} value={block.id}>
              Блок {index + 1}: {block.name}
            </option>
          ))}
      </select>
    </label>
  );
}
