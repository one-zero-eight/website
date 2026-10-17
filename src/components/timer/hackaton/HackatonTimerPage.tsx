import { useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { useInterval } from "usehooks-ts";
import { useLastUsedTimer } from "@/components/timer/lib/useLastUsedTimer";
import { TimelineEditor } from "./TimelineEditor";
import { TimelineWheel } from "./TimelineWheel";
import {
  createInitialPlan,
  formatCountdown,
  formatDateTime,
  sortMilestones,
} from "./utils";

// Digits are about 0.6em wide, so the clock font size is chosen to fill the column
const CLOCK_CHAR_WIDTH_EM = 0.6;
const CLOCK_WIDTH_PERCENT = 100;

export function HackatonTimerPage() {
  useLastUsedTimer("hackaton");
  const [plan, setPlan] = useState(createInitialPlan);
  const [isEditing, setIsEditing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now);
  const [scrolledIndex, setScrolledIndex] = useState<number | null>(null);

  useInterval(() => setNowMs(Date.now()), 1000);

  const milestones = useMemo(
    () => sortMilestones(plan.milestones),
    [plan.milestones],
  );

  const finishMs = new Date(plan.finish).getTime();
  const nextMilestoneIndex = milestones.findIndex(
    (milestone) => new Date(milestone.time).getTime() > nowMs,
  );
  const upcomingMilestone = milestones[nextMilestoneIndex];
  const targetMs = upcomingMilestone
    ? Math.min(new Date(upcomingMilestone.time).getTime(), finishMs)
    : finishMs;
  const targetTitle =
    upcomingMilestone && new Date(upcomingMilestone.time).getTime() <= finishMs
      ? upcomingMilestone.title
      : "Finish";
  const countdown = formatCountdown(targetMs - nowMs);

  const defaultFocusedIndex =
    nextMilestoneIndex === -1 ? milestones.length - 1 : nextMilestoneIndex;
  const focusedIndex = Math.min(
    scrolledIndex ?? defaultFocusedIndex,
    milestones.length - 1,
  );

  function handleDoneEditing() {
    setPlan({ ...plan, milestones });
    setScrolledIndex(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="@container/content flex grow justify-center p-4 md:p-8">
        <TimelineEditor
          plan={plan}
          onPlanChange={setPlan}
          onDone={handleDoneEditing}
        />
      </div>
    );
  }

  return (
    <div className="@container/content flex grow flex-col gap-8 p-4 md:p-8">
      <h1
        className={cn(
          "text-center text-3xl font-bold break-words sm:text-4xl md:text-5xl",
          !plan.title && "text-base-content/50",
        )}
      >
        {plan.title || "Untitled timer"}
      </h1>
      <div className="mx-auto flex w-full max-w-5xl grow flex-col items-center justify-center gap-12">
        <div className="@container/countdown flex w-full flex-col items-center gap-6 text-center">
          <p className="text-base-content/70 text-4xl font-semibold md:text-5xl">
            Until {targetTitle}
          </p>
          <div className="text-primary flex flex-col items-center leading-none font-bold tabular-nums">
            {countdown.days > 0 && (
              <span className="text-4xl md:text-6xl">
                {countdown.days} {countdown.days === 1 ? "day" : "days"}
              </span>
            )}
            <span
              style={{
                fontSize: `min(${CLOCK_WIDTH_PERCENT / (countdown.clock.length * CLOCK_CHAR_WIDTH_EM)}cqw, 14rem)`,
              }}
            >
              {countdown.clock}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={() => setIsEditing(true)}
          >
            <span className="icon-[material-symbols--edit-outline]" />
            Edit
          </button>
        </div>

        <div className="flex w-full flex-col gap-3">
          <TimelineWheel
            milestones={milestones}
            focusedIndex={focusedIndex}
            nextIndex={
              nextMilestoneIndex === -1 ? milestones.length : nextMilestoneIndex
            }
            onFocusedIndexChange={setScrolledIndex}
          />
          <div className="border-base-300 flex items-center justify-between gap-4 border-t pt-3">
            <span className="text-base-content/70">
              Started {formatDateTime(plan.start)}
            </span>
            <div className="flex items-center gap-2">
              <span className="icon-[material-symbols--flag-outline-rounded] text-primary text-2xl" />
              <span className="text-lg font-bold">Finish</span>
              <span className="text-base-content/70">
                {formatDateTime(plan.finish)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
