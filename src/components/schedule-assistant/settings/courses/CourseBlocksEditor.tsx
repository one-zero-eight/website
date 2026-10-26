import { cn } from "@/lib/ui/cn";
import {
  sortSemesterBlocks,
  type SemesterBlock,
} from "@/components/schedule-assistant/settings/semester/semesterBlocks.ts";

export function CourseBlocksEditor({
  blocks,
  value,
  onChange,
  disabled,
}: {
  blocks: readonly SemesterBlock[];
  value: string[] | null;
  onChange: (blocks: string[] | null) => void;
  disabled: boolean;
}) {
  const sortedBlocks = sortSemesterBlocks(blocks);
  const missingIds =
    value?.filter((id) => !blocks.some((block) => block.id === id)) ?? [];
  return (
    <fieldset
      disabled={disabled}
      className="border-base-300 rounded-box flex shrink-0 flex-col gap-2 border p-3"
    >
      <legend className="text-base-content/70 px-1 text-xs font-medium tracking-wide uppercase">
        Блоки курса
      </legend>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={value === null}
          onChange={(event) => {
            if (event.target.checked) {
              onChange(null);
              return;
            }
            if (sortedBlocks[0]) onChange([sortedBlocks[0].id]);
          }}
          disabled={disabled || (sortedBlocks.length === 0 && value === null)}
        />
        Весь семестр
      </label>
      <div className="flex flex-wrap gap-2">
        {sortedBlocks.map((block, index) => {
          const checked = value?.includes(block.id) ?? false;
          return (
            <label
              key={block.id}
              className={cn(
                "border-base-300 rounded-box flex cursor-pointer items-center gap-2 border px-2 py-1 text-sm",
                checked && "border-primary bg-primary/10",
              )}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={checked}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...(value ?? []), block.id]
                    : (value ?? []).filter((id) => id !== block.id);
                  onChange(next.length ? next : null);
                }}
              />
              <span>
                Блок {index + 1}: {block.name}
                <span className="text-base-content/60 block text-xs">
                  {block.start_date} — {block.end_date}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {missingIds.length ? (
        <p className="text-error text-xs">
          Неизвестные блоки: {missingIds.join(", ")}. Выберите действующие блоки
          или весь семестр.
        </p>
      ) : null}
      <p className="text-base-content/60 text-xs">
        Это метаданные пула курса. Выбор не меняет периоды серий и даты
        существующих занятий. Если снять последний блок, будет выбран весь
        семестр.
      </p>
      {!blocks.length ? (
        <p className="text-base-content/60 text-xs">
          Добавьте блоки в настройках семестра, чтобы выбрать отдельные периоды.
        </p>
      ) : null}
    </fieldset>
  );
}
