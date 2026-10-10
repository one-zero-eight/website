import { useState } from "react";
import { PomodoroControls } from "./components/PomodoroControls";
import { PomodoroCycleDots } from "./components/PomodoroCycleDots";
import { PomodoroSettingsModal } from "./components/PomodoroSettingsModal";
import { PomodoroMode, usePomodoro } from "./lib/usePomodoro";

const MODE_LABELS: Record<PomodoroMode, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PomodoroPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pomodoro = usePomodoro();
  const { settings, mode, secondsLeft, totalSeconds, isRunning } = pomodoro;

  const isPaused = !isRunning && secondsLeft < totalSeconds;

  const sessionsInCycle =
    mode === "longBreak"
      ? settings.sessionsBeforeLongBreak
      : pomodoro.completedWorkSessions % settings.sessionsBeforeLongBreak;

  return (
    <div className="relative flex grow flex-col items-center gap-6 p-4 md:p-8">
      <button
        type="button"
        className="btn btn-square btn-lg absolute top-4 right-4 text-2xl"
        onClick={() => setSettingsOpen(true)}
      >
        <span className="icon-[material-symbols--settings-outline]" />
      </button>

      <div className="flex w-full grow flex-col items-center justify-center gap-8">
        <div className="text-2xl font-bold sm:text-3xl">
          {MODE_LABELS[mode]}
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
