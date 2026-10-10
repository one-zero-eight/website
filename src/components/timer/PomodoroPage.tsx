import { cn } from "@/lib/ui/cn";
import { useEffect, useRef, useState } from "react";
import { PomodoroControls } from "./components/PomodoroControls";
import { PomodoroCycleDots } from "./components/PomodoroCycleDots";
import { PomodoroSettingsModal } from "./components/PomodoroSettingsModal";
import { useFullscreenCursor } from "./lib/useFullScreenCursor";
import { useLastUsedTimer } from "./lib/useLastUsedTimer";
import { usePomodoroContext } from "./lib/pomodoroContext";
import { POMODORO_MODE_LABELS } from "./lib/usePomodoro";
import { useFullscreen, useWakeLock } from "./lib/utils";

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PomodoroPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeLock = useWakeLock();
  const isFullscreen = useFullscreen();
  useFullscreenCursor(containerRef, 5000);
  useLastUsedTimer("pomodoro");
  const pomodoro = usePomodoroContext();
  const { settings, mode, secondsLeft, totalSeconds, isRunning } = pomodoro;

  useEffect(() => {
    if (!isRunning) return;
    wakeLock.request();
    return () => {
      wakeLock.release();
    };
  }, [isRunning, wakeLock]);

  const switchFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  };

  const isPaused = !isRunning && secondsLeft < totalSeconds;

  const sessionsInCycle =
    mode === "longBreak"
      ? settings.sessionsBeforeLongBreak
      : pomodoro.completedWorkSessions % settings.sessionsBeforeLongBreak;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex grow flex-col items-center gap-6 p-4 md:p-8",
        isFullscreen && "bg-base-100",
      )}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        {/* The settings modal is rendered outside the fullscreen element, so it would be invisible */}
        {!isFullscreen && (
          <button
            type="button"
            className="btn btn-square btn-lg text-2xl"
            onClick={() => setSettingsOpen(true)}
          >
            <span className="icon-[material-symbols--settings-outline]" />
          </button>
        )}
        <button
          type="button"
          className="btn btn-square btn-lg text-2xl"
          onClick={switchFullscreen}
        >
          {isFullscreen ? (
            <span className="icon-[material-symbols--fullscreen-exit]" />
          ) : (
            <span className="icon-[material-symbols--fullscreen]" />
          )}
        </button>
      </div>

      <div className="flex w-full grow flex-col items-center justify-center gap-8">
        <div className="text-2xl font-bold sm:text-3xl">
          {POMODORO_MODE_LABELS[mode]}
        </div>

        <div className="text-primary text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl lg:text-[150px]">
          {formatSeconds(secondsLeft)}
        </div>

        <progress
          className="progress progress-primary h-4 w-full max-w-[900px]"
          value={totalSeconds - secondsLeft}
          max={totalSeconds}
        />

        <PomodoroControls
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={pomodoro.start}
          onPause={pomodoro.pause}
          onReset={pomodoro.reset}
          onSkip={pomodoro.skip}
        />

        <PomodoroCycleDots
          completedSessions={sessionsInCycle}
          totalSessions={settings.sessionsBeforeLongBreak}
        />
      </div>

      <PomodoroSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={pomodoro.updateSettings}
      />
    </div>
  );
}
