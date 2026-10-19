import { cn } from "@/lib/ui/cn";
import { useFullscreenCursor } from "@/components/timer/lib/useFullScreenCursor";
import { useLastUsedTimer } from "@/components/timer/lib/useLastUsedTimer";
import { useFullscreen } from "@/components/timer/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useInterval } from "usehooks-ts";
import { CopyCodeButton } from "./components/CopyCodeButton";
import { RemoveTimerModal } from "./components/RemoveTimerModal";
import { TimersDropdown } from "./components/TimersDropdown";
import { TimelineEditor } from "./components/TimelineEditor";
import { TimelineWheel } from "./components/TimelineWheel";
import { useHackathonTimers } from "./lib/useHackathonTimers";
import { useLastOpenedHackathon } from "./lib/useLastOpenedHackathon";
import {
  formatCountdown,
  formatDateTime,
  HackathonTimer,
  sortMilestones,
} from "./utils";

// Digits are about 0.6em wide, so the clock font size is chosen to fill the column
const CLOCK_CHAR_WIDTH_EM = 0.6;
const CLOCK_WIDTH_PERCENT = 100;

export function HackathonTimerPage({ id }: { id: string }) {
  const { timers } = useHackathonTimers();
  const timer = timers.find((item) => item.id === id);

  if (!timer) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-4 p-4">
        <p className="text-base-content/70 text-xl">Timer not found</p>
        <Link to="/timer/hackathon" className="btn btn-primary">
          Back to timers
        </Link>
      </div>
    );
  }

  return <HackathonTimerView timer={timer} />;
}

function HackathonTimerView({ timer }: { timer: HackathonTimer }) {
  useLastUsedTimer("hackathon");
  useLastOpenedHackathon(timer.id);
  const navigate = useNavigate();
  const { updateTimer, removeTimer } = useHackathonTimers();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useFullscreen();
  useFullscreenCursor(containerRef, 5000);
  const [isEditing, setIsEditing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now);
  const [scrolledIndex, setScrolledIndex] = useState<number | null>(null);

  useInterval(() => setNowMs(Date.now()), 1000);

  const milestones = useMemo(
    () => sortMilestones(timer.milestones),
    [timer.milestones],
  );

  const finishMs = new Date(timer.finish).getTime();
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
    updateTimer({ ...timer, milestones });
    setScrolledIndex(null);
    setIsEditing(false);
  }

  function handleConfirmRemove() {
    removeTimer(timer.id);
    navigate({ to: "/timer/hackathon" });
  }

  function handleSwitchFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    containerRef.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "@container/content flex grow flex-col gap-8 p-4 md:p-8",
        isFullscreen && "bg-base-100",
      )}
    >
      <div className="flex items-center justify-end gap-2">
        {!isFullscreen && (
          <div className="mr-auto">
            <TimersDropdown currentTimerId={timer.id} />
          </div>
        )}
        {timer.joinCode && !isFullscreen && (
          <CopyCodeButton code={timer.joinCode} />
        )}
        {!isFullscreen && !isEditing && (
          <button
            type="button"
            className="btn btn-lg"
            onClick={() =>
              timer.isOwner ? setIsEditing(true) : setIsRemoveOpen(true)
            }
          >
            {timer.isOwner ? (
              <>
                <span className="icon-[material-symbols--edit-outline]" />
                Edit
              </>
            ) : (
              <>
                <span className="icon-[material-symbols--logout]" />
                Unsubscribe
              </>
            )}
          </button>
        )}
        <button
          type="button"
          className="btn btn-square btn-lg hidden text-2xl md:inline-flex"
          onClick={handleSwitchFullscreen}
        >
          {isFullscreen ? (
            <span className="icon-[material-symbols--fullscreen-exit]" />
          ) : (
            <span className="icon-[material-symbols--fullscreen]" />
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="flex grow justify-center">
          <TimelineEditor
            timer={timer}
            onTimerChange={updateTimer}
            heading="Edit timer"
            doneLabel="Done"
            onDone={handleDoneEditing}
            onDelete={() => setIsRemoveOpen(true)}
          />
        </div>
      ) : (
        <>
          <h1
            className={cn(
              "text-center text-3xl font-bold break-words sm:text-4xl md:text-5xl",
              !timer.title && "text-base-content/50",
            )}
          >
            {timer.title || "Untitled timer"}
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
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="min-w-0 grow">
                <TimelineWheel
                  milestones={milestones}
                  focusedIndex={focusedIndex}
                  nextIndex={
                    nextMilestoneIndex === -1
                      ? milestones.length
                      : nextMilestoneIndex
                  }
                  onFocusedIndexChange={setScrolledIndex}
                />
              </div>
              <div className="hidden w-36 shrink-0 flex-col items-center md:flex">
                <div className="flex h-8 items-center">
                  <span className="icon-[material-symbols--flag-outline-rounded] text-primary text-3xl" />
                </div>
                <div className="mt-2 flex flex-col text-center">
                  <span className="text-2xl font-semibold">Finish</span>
                  <span className="text-base-content/70 text-lg">
                    {formatDateTime(timer.finish)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <RemoveTimerModal
        timer={isRemoveOpen ? timer : null}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
