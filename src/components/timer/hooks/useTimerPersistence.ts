import { useCallback, useEffect } from "react";

interface TimerState {
  title: string;
  targetEndTime?: number;
  initialSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedSecondsLeft?: number;
}

interface UsePersistenceProps {
  title: string;
  isRunning: boolean;
  isPaused: boolean;
  initialSeconds: number;
  targetEndTime: number | null;
  onRestore: (state: TimerState) => void;
}

export const useTimerPersistence = ({
  title,
  isRunning,
  isPaused,
  initialSeconds,
  targetEndTime,
  onRestore,
}: UsePersistenceProps) => {
  const saveState = useCallback(
    (seconds?: number) => {
      const stateToSave: any = {
        title,
        initialSeconds,
        isRunning,
        isPaused,
      };

      if (isPaused && seconds !== undefined) {
        stateToSave.pausedSecondsLeft = seconds;
      } else if (targetEndTime) {
        stateToSave.targetEndTime = targetEndTime;
      }

      localStorage.setItem("timerState", JSON.stringify(stateToSave));
    },
    [title, isRunning, isPaused, initialSeconds, targetEndTime],
  );

  const clearState = () => {
    localStorage.removeItem("timerState");
  };

  useEffect(() => {
    const savedState = localStorage.getItem("timerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      onRestore(state);
    }
  }, [onRestore]);

  return { saveState, clearState };
};
