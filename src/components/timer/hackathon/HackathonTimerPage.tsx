import { $timer } from "@/api/timer";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useFullscreenCursor } from "@/components/timer/lib/useFullScreenCursor";
import { useLastUsedTimer } from "@/components/timer/lib/useLastUsedTimer";
import { useFullscreen } from "@/components/timer/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useInterval } from "usehooks-ts";
import { RemoveTimerModal } from "./components/RemoveTimerModal";
import { TimersDropdown } from "./components/TimersDropdown";
import { TimelineEditor } from "./components/TimelineEditor";
import { TimelineWheel } from "./components/TimelineWheel";
import { useHackathonTimers, useRefreshTimers } from "./lib/useHackathonTimers";
import { useLastOpenedHackathon } from "./lib/useLastOpenedHackathon";
import {
  formatCountdown,
  formatDateTime,
  HackathonTimer,
  sortMilestones,
  TimerDraft,
  toDraft,
  toTimerBody,
} from "./utils";

// Digits are about 0.6em wide, so the clock font size is chosen to fill the column
const CLOCK_CHAR_WIDTH_EM = 0.6;
const CLOCK_WIDTH_PERCENT = 100;

export function HackathonTimerPage({ id }: { id: string }) {
  const { timers, isError, error, refetch } = useHackathonTimers();

  if (isError) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-4 p-4">
        <p className="text-error text-xl">{formatApiErrorMessage(error)}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!timers) {
    return (
      <div className="flex grow flex-col gap-8 p-4 md:p-8">
        <div className="skeleton h-12 w-full max-w-md self-center" />
        <div className="skeleton h-48 w-full max-w-5xl self-center" />
      </div>
    );
  }

  const timer = timers.find((item) => item.id === Number(id));
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
  const { showError } = useToast();
  const refreshTimers = useRefreshTimers();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useFullscreen();
  useFullscreenCursor(containerRef, 5000);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TimerDraft>(() => toDraft(timer));
  const [nowMs, setNowMs] = useState(Date.now);
  const [scrolledIndex, setScrolledIndex] = useState<number | null>(null);

  const { mutate: updateTimer, isPending: isUpdating } = $timer.useMutation(
    "put",
    "/timers/{timer_id}",
    {
      onSuccess: refreshTimers,
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );
  const { mutate: deleteTimer, isPending: isDeleting } = $timer.useMutation(
    "delete",
    "/timers/{timer_id}",
    {
      onSuccess: refreshTimers,
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

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

  function handleStartEditing() {
    setDraft(toDraft(timer));
    setIsEditing(true);
  }

  function handleDoneEditing() {
    updateTimer(
      {
        params: { path: { timer_id: timer.id } },
        body: toTimerBody(draft),
      },
      {
        onSuccess: () => {
          setScrolledIndex(null);
          setIsEditing(false);
        },
      },
    );
  }

  function handleConfirmRemove() {
    deleteTimer(
      { params: { path: { timer_id: timer.id } } },
      { onSuccess: () => navigate({ to: "/timer/hackathon" }) },
    );
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
        {timer.isCreator && !isFullscreen && !isEditing && (
          <button
            type="button"
            className="btn btn-lg"
            onClick={handleStartEditing}
          >
            <span className="icon-[material-symbols--edit-outline]" />
            Edit
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
            draft={draft}
            onDraftChange={setDraft}
            timerId={timer.id}
            heading="Edit timer"
            doneLabel="Done"
            isSaving={isUpdating}
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
        isDeleting={isDeleting}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
