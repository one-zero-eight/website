import { cn } from "@/lib/ui/cn";
import { useEventListener } from "usehooks-ts";
import { formatDateTime, Milestone } from "./utils";

export function TimelineWheel({
  milestones,
  focusedIndex,
  nextIndex,
  onFocusedIndexChange,
}: {
  milestones: Milestone[];
  focusedIndex: number;
  nextIndex: number;
  onFocusedIndexChange: (index: number) => void;
}) {
  function moveFocus(step: number) {
    const clampedIndex = Math.min(
      Math.max(focusedIndex + step, 0),
      milestones.length - 1,
    );
    onFocusedIndexChange(clampedIndex);
  }

  useEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveFocus(event.key === "ArrowRight" ? 1 : -1);
  });

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle text-xl"
        disabled={focusedIndex <= 0}
        onClick={() => moveFocus(-1)}
      >
        <span className="icon-[material-symbols--keyboard-arrow-left]" />
      </button>

      <div className="relative h-32 min-w-0 grow overflow-hidden">
        <div className="bg-base-content/40 absolute top-4 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full" />
        {milestones.map((milestone, index) => {
          const distance = index - focusedIndex;
          if (Math.abs(distance) > 2) return null;
          const isVisible = Math.abs(distance) <= 1;
          const isNext = index === nextIndex;
          const isPast = index < nextIndex;

          return (
            <div
              key={milestone.id}
              className={cn(
                "pointer-events-none absolute top-0 left-1/2 flex w-1/3 flex-col items-center transition-[transform,opacity] duration-300 ease-out",
                isVisible ? "opacity-100" : "opacity-0",
              )}
              style={{ transform: `translateX(${distance * 100 - 50}%)` }}
            >
              <div className="flex h-8 items-center">
                <span
                  className={cn(
                    "size-5 rounded-full",
                    isNext
                      ? "bg-primary ring-primary/30 ring-4"
                      : "bg-base-content",
                  )}
                />
              </div>
              <div
                className={cn(
                  "mt-2 flex w-full min-w-0 flex-col px-2 text-center",
                  isPast && "opacity-50",
                )}
              >
                <span className="truncate text-2xl font-semibold">
                  {milestone.title}
                </span>
                <span className="text-base-content/70 text-lg">
                  {formatDateTime(milestone.time)}
                </span>
              </div>
            </div>
          );
        })}
        {milestones.length === 0 && (
          <p className="text-base-content/60 absolute top-10 w-full text-center">
            No milestones yet
          </p>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle text-xl"
        disabled={focusedIndex >= milestones.length - 1}
        onClick={() => moveFocus(1)}
      >
        <span className="icon-[material-symbols--keyboard-arrow-right]" />
      </button>
    </div>
  );
}
