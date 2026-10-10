import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

export type PomodoroMode = "work" | "shortBreak" | "longBreak";

export const POMODORO_MODE_LABELS: Record<PomodoroMode, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

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

const SETTINGS_STORAGE_KEY = "pomodoro-settings";
const STATE_STORAGE_KEY = "pomodoro-state";
const TICK_INTERVAL_MS = 250;

type PomodoroState = {
  mode: PomodoroMode;
  completedWorkSessions: number;
  targetEndTime: number | null;
  pausedSecondsLeft: number | null;
};

const INITIAL_POMODORO_STATE: PomodoroState = {
  mode: "work",
  completedWorkSessions: 0,
  targetEndTime: null,
  pausedSecondsLeft: null,
};

function getRemainingSeconds(targetEndTime: number) {
  return Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
}

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

export function usePomodoro({
  onTimeUp,
}: {
  // Called with the upcoming mode when a period ends by itself (not when it is skipped)
  onTimeUp?: (nextMode: PomodoroMode) => void;
} = {}) {
  const [storedSettings, setSettings] = useLocalStorage<
    Partial<PomodoroSettings>
  >(SETTINGS_STORAGE_KEY, DEFAULT_POMODORO_SETTINGS);
  // Fill in missing keys, so older or broken stored values do not break the timer
  const settings = useMemo(
    () => ({ ...DEFAULT_POMODORO_SETTINGS, ...storedSettings }),
    [storedSettings],
  );
  const [storedState, setState] = useLocalStorage<Partial<PomodoroState>>(
    STATE_STORAGE_KEY,
    INITIAL_POMODORO_STATE,
  );
  const state = useMemo(
    () => ({ ...INITIAL_POMODORO_STATE, ...storedState }),
    [storedState],
  );
  const { mode, completedWorkSessions, targetEndTime } = state;
  const isRunning = targetEndTime !== null;
  const totalSeconds = getModeSeconds(mode, settings);

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (targetEndTime !== null) return getRemainingSeconds(targetEndTime);
    return state.pausedSecondsLeft ?? totalSeconds;
  });

  const selectMode = useCallback(
    (newMode: PomodoroMode, newCompletedWorkSessions: number) => {
      setState({
        mode: newMode,
        completedWorkSessions: newCompletedWorkSessions,
        targetEndTime: null,
        pausedSecondsLeft: null,
      });
      setSecondsLeft(getModeSeconds(newMode, settings));
    },
    [settings, setState],
  );

  const start = () =>
    setState({ ...state, targetEndTime: Date.now() + secondsLeft * 1000 });

  const pause = () =>
    setState({ ...state, targetEndTime: null, pausedSecondsLeft: secondsLeft });

  const reset = () => selectMode("work", 0);

  const updateSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    // Apply new duration right away only if the current period has not been started yet
    const isUntouched = !isRunning && secondsLeft === totalSeconds;
    if (isUntouched) setSecondsLeft(getModeSeconds(mode, newSettings));
  };

  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });

  const completeCurrentMode = useCallback(() => {
    const newCompletedWorkSessions =
      mode === "work" ? completedWorkSessions + 1 : completedWorkSessions;
    const nextMode = getNextMode(mode, newCompletedWorkSessions, settings);
    selectMode(nextMode, newCompletedWorkSessions);
    return nextMode;
  }, [mode, completedWorkSessions, settings, selectMode]);

  useEffect(() => {
    if (targetEndTime === null) return;

    const intervalId = window.setInterval(() => {
      const remainingSeconds = getRemainingSeconds(targetEndTime);
      setSecondsLeft(remainingSeconds);
      if (remainingSeconds > 0) return;

      onTimeUpRef.current?.(completeCurrentMode());
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
