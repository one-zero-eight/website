import { cn } from "@/lib/ui/cn";
import { useEventListener, useMediaQuery } from "usehooks-ts";
import { formatDateTime, Milestone } from "../utils";

// Desktop shows one passed milestone, the next one and two after it.
// Mobile shows only the current milestone.
const DESKTOP_SLOTS = { visible: 4, passed: 1 };
const MOBILE_SLOTS = { visible: 1, passed: 0 };
const PASSED_ITEM_SCALE = 0.8;

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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { visible: visibleSlots, passed: passedSlots } = isMobile
    ? MOBILE_SLOTS
    : DESKTOP_SLOTS;

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
          const slot = index - focusedIndex + passedSlots;
          // One extra slot on each side lets items fade in and out while moving
          if (slot < -1 || slot > visibleSlots) return null;
          const isVisible = slot >= 0 && slot < visibleSlots;
          const scale = slot < passedSlots ? PASSED_ITEM_SCALE : 1;
          const isNext = index === nextIndex;
          const isPast = index < nextIndex;

          return (
            <div
              key={milestone.id}
              className={cn(
                "pointer-events-none absolute top-0 left-0 flex origin-[50%_1rem] flex-col items-center transition-[transform,opacity] duration-300 ease-out",
                isVisible ? "opacity-100" : "opacity-0",
              )}
              style={{
                width: `${100 / visibleSlots}%`,
                transform: `translateX(${slot * 100}%) scale(${scale})`,
              }}
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
