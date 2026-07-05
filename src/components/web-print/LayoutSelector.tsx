import { PrintingOptionsNumberUpAnyOf0 } from "@/api/printers/types.ts";
import { cn } from "@/lib/ui/cn";

const LAYOUT_OPTIONS = [
  {
    value: PrintingOptionsNumberUpAnyOf0.Value1,
    label: "1×1",
    subtitle: "1 page",
    cols: 1,
    rows: 1,
  },
  {
    value: PrintingOptionsNumberUpAnyOf0.Value2,
    label: "1×2",
    subtitle: "2 pages",
    cols: 1,
    rows: 2,
  },
  {
    value: PrintingOptionsNumberUpAnyOf0.Value4,
    label: "2×2",
    subtitle: "4 pages",
    cols: 2,
    rows: 2,
  },
  {
    value: PrintingOptionsNumberUpAnyOf0.Value6,
    label: "2×3",
    subtitle: "6 pages",
    cols: 2,
    rows: 3,
  },
  {
    value: PrintingOptionsNumberUpAnyOf0.Value9,
    label: "3×3",
    subtitle: "9 pages",
    cols: 3,
    rows: 3,
  },
  {
    value: PrintingOptionsNumberUpAnyOf0.Value16,
    label: "4×4",
    subtitle: "16 pages",
    cols: 4,
    rows: 4,
  },
] as const;

export function LayoutSelector({
  value,
  onChange,
}: {
  value: PrintingOptionsNumberUpAnyOf0;
  onChange: (value: PrintingOptionsNumberUpAnyOf0) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {LAYOUT_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-box flex flex-col items-center gap-2 border p-3 transition-colors",
              isSelected
                ? "border-primary bg-primary/10 ring-primary ring-2 ring-inset"
                : "border-base-300 bg-base-100 hover:bg-base-200",
            )}
            onClick={() => onChange(option.value)}
          >
            <LayoutSheetPreview cols={option.cols} rows={option.rows} />
            <div className="text-center">
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="text-base-content/60 text-xs">
                {option.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LayoutSheetPreview({ cols, rows }: { cols: number; rows: number }) {
  const pageCount = cols * rows;

  return (
    <div className="border-base-content/25 bg-base-200 aspect-210/297 w-16 shrink-0 overflow-hidden rounded-sm border p-1 shadow-sm">
      <div
        className="grid h-full min-h-0 w-full min-w-0 gap-px"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <div
            key={index}
            className="border-base-content/20 bg-base-100 min-h-0 min-w-0 rounded-[1px] border"
          />
        ))}
      </div>
    </div>
  );
}
