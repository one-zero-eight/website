import clsx from "clsx";
import { useRef } from "react";

export type TimetableLayoutMode = "groups" | "calendar";

const LAYOUT_OPTIONS: {
  value: TimetableLayoutMode;
  label: string;
}[] = [
  { value: "groups", label: "По группам" },
  { value: "calendar", label: "По дням" },
];

export function TimetableLayoutSelector({
  layoutMode,
  onLayoutModeChange,
  calendarDisabled,
}: {
  layoutMode: TimetableLayoutMode;
  onLayoutModeChange: (mode: TimetableLayoutMode) => void;
  calendarDisabled?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const currentLabel =
    LAYOUT_OPTIONS.find((option) => option.value === layoutMode)?.label ??
    LAYOUT_OPTIONS[0]!.label;

  function handleOptionClick(nextMode: TimetableLayoutMode) {
    if (nextMode === "calendar" && calendarDisabled) return;
    onLayoutModeChange(nextMode);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="dropdown shrink-0">
      <summary className="select select-bordered select-xs flex h-8 min-h-8 w-[9.5rem] cursor-pointer list-none items-center justify-between px-3 text-sm font-normal [&::-webkit-details-marker]:hidden">
        <span className="truncate">{currentLabel}</span>
        <span className="icon-[material-symbols--expand-more] shrink-0 text-base" />
      </summary>
      <ul className="dropdown-content border-base-300 bg-base-100 rounded-box mt-1 w-[11rem] border p-1 shadow-sm">
        {LAYOUT_OPTIONS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              className={clsx(
                "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                layoutMode === option.value && "bg-base-200 font-semibold",
                option.value === "calendar" &&
                  calendarDisabled &&
                  "cursor-not-allowed opacity-50",
              )}
              disabled={option.value === "calendar" && calendarDisabled}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
