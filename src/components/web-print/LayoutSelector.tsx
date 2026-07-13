import { PrintingOptionsNumberUpAnyOf0 } from "@/api/printers/types.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    LAYOUT_OPTIONS.find((option) => option.value === value) ??
    LAYOUT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <button
        type="button"
        className={cn(
          "rounded-field border-base-content/20 flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left transition-colors",
          open ? "border-primary bg-primary/5" : "hover:border-base-content/40",
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <LayoutSheetPreview cols={selected.cols} rows={selected.rows} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">{selected.label}</p>
          <p className="text-base-content/50 text-sm">{selected.subtitle}</p>
        </div>
        <span
          className={cn(
            "icon-[material-symbols--expand-more-rounded] text-base-content/50 shrink-0 text-xl transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_OPTIONS.map((option) => {
            const isSelected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-field border-base-content/20 flex flex-col items-center gap-1.5 border-2 px-2 py-2.5 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:border-base-content/40",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <LayoutSheetPreview cols={option.cols} rows={option.rows} />
                <div className="text-center">
                  <p className="text-sm">{option.label}</p>
                  <p className="text-base-content/50 text-xs">
                    {option.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LayoutSheetPreview({ cols, rows }: { cols: number; rows: number }) {
  const pageCount = cols * rows;

  return (
    <div className="border-base-content/25 bg-base-200 aspect-210/297 w-10 shrink-0 overflow-hidden rounded-sm border p-0.5">
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
