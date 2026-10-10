import { useCallback, useEffect, useState } from "react";

export type PomodoroMode = "work" | "shortBreak" | "longBreak";

export type PomodoroSettings = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  // Every N-th finished work session is followed by a long break
  sessionsBeforeLongBreak: number;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

const TICK_INTERVAL_MS = 250;

function getModeSeconds(mode: PomodoroMode, settings: PomodoroSettings) {
  const minutesByMode: Record<PomodoroMode, number> = {
    work: settings.workMinutes,
    shortBreak: settings.shortBreakMinutes,
    longBreak: settings.longBreakMinutes,
  };
  return minutesByMode[mode] * 60;
}

function getNextMode(
  currentMode: PomodoroMode,
  completedWorkSessions: number,
  settings: PomodoroSettings,
): PomodoroMode {
  if (currentMode !== "work") return "work";
  if (completedWorkSessions % settings.sessionsBeforeLongBreak === 0) {
    return "longBreak";
  }
  return "shortBreak";
}

export function usePomodoro() {
  const [settings, setSettings] = useState(DEFAULT_POMODORO_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(
    getModeSeconds("work", settings),
  );
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);
  // The timer is running if and only if the end time is set.
  // Counting down to a fixed end time (not decrementing) keeps it accurate in background tabs.
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const isRunning = targetEndTime !== null;
  const totalSeconds = getModeSeconds(mode, settings);

  const selectMode = useCallback(
    (newMode: PomodoroMode) => {
      setMode(newMode);
      setSecondsLeft(getModeSeconds(newMode, settings));
      setTargetEndTime(null);
    },
    [settings],
  );

  const start = () => setTargetEndTime(Date.now() + secondsLeft * 1000);

  const pause = () => setTargetEndTime(null);

  const reset = () => selectMode(mode);

  const updateSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    // Apply new duration right away only if the current period has not been started yet
    const isUntouched = !isRunning && secondsLeft === totalSeconds;
    if (isUntouched) setSecondsLeft(getModeSeconds(mode, newSettings));
  };

  const completeCurrentMode = useCallback(() => {
    const newCompletedWorkSessions =
      mode === "work" ? completedWorkSessions + 1 : completedWorkSessions;
    setCompletedWorkSessions(newCompletedWorkSessions);
    selectMode(getNextMode(mode, newCompletedWorkSessions, settings));
  }, [mode, completedWorkSessions, settings, selectMode]);

  useEffect(() => {
    if (targetEndTime === null) return;

    const intervalId = window.setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((targetEndTime - Date.now()) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      if (remainingSeconds > 0) return;

      completeCurrentMode();
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [targetEndTime, completeCurrentMode]);

  return {
    settings,
    mode,
    secondsLeft,
    totalSeconds,
    completedWorkSessions,
    isRunning,
    start,
    pause,
    reset,
    skip: completeCurrentMode,
    updateSettings,
  };
}
