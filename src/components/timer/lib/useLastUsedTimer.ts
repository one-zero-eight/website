import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

// All timer sections. New timer mode TBD
export const TIMER_PATHS = {
  countdown: "/timer",
  pomodoro: "/timer/pomodoro",
} as const;

export type TimerType = keyof typeof TIMER_PATHS;

const DEFAULT_TIMER: TimerType = "countdown";
const LAST_USED_TIMER_STORAGE_KEY = "last-used-timer";

export function useLastUsedTimer(openedTimer?: TimerType) {
  const [storedTimer, setLastUsedTimer] = useLocalStorage<string>(
    LAST_USED_TIMER_STORAGE_KEY,
    DEFAULT_TIMER,
  );
  const lastUsedTimer = isTimerType(storedTimer) ? storedTimer : DEFAULT_TIMER;

  useEffect(() => {
    if (openedTimer) setLastUsedTimer(openedTimer);
  }, [openedTimer, setLastUsedTimer]);

  return { lastUsedTimer, setLastUsedTimer };
}

function isTimerType(value: string): value is TimerType {
  return value in TIMER_PATHS;
}
