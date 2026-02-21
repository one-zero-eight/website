import { useEffect, useRef } from "react";

interface UseTimerIntervalProps {
  isRunning: boolean;
  isPaused: boolean;
  targetEndTime: number | null;
  initialSeconds: number;
  hasAdjustedTimerRef: React.MutableRefObject<boolean>;
  setTargetEndTime: (time: number) => void;
  setSecondsLeft: (seconds: number) => void;
  formatTime: (seconds: number) => void;
  handleTimerComplete: () => void;
  saveState: () => void;
}

export const useTimerInterval = ({
  isRunning,
  isPaused,
  targetEndTime,
  initialSeconds,
  hasAdjustedTimerRef,
  setTargetEndTime,
  setSecondsLeft,
  formatTime,
  handleTimerComplete,
  saveState,
}: UseTimerIntervalProps) => {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isRunning || isPaused || !targetEndTime) return;

    const now = Date.now();
    const remainingMs = targetEndTime - now;
    let adjustedTargetEndTime = targetEndTime;

    const expectedRemainingMs = initialSeconds * 1000;
    const timeLost = expectedRemainingMs - remainingMs;
    const isNewlyStartedTimer = Math.abs(timeLost) < 5000;

    if (
      timeLost > 200 &&
      timeLost < 5000 &&
      !hasAdjustedTimerRef.current &&
      isNewlyStartedTimer
    ) {
      adjustedTargetEndTime = now + initialSeconds * 1000;
      hasAdjustedTimerRef.current = true;
      setTargetEndTime(adjustedTargetEndTime);
      return;
    }

    const initialRemainingMs = adjustedTargetEndTime - now;
    const initialRemainingSeconds = Math.max(
      0,
      Math.round(initialRemainingMs / 1000),
    );

    setSecondsLeft(initialRemainingSeconds);
    formatTime(initialRemainingSeconds);

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const remainingMs = adjustedTargetEndTime - now;
      const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));

      if (remainingMs <= 0) {
        handleTimerComplete();
        return;
      }

      setSecondsLeft(remainingSeconds);
      formatTime(remainingSeconds);

      if (
        Math.floor(remainingMs / 1000) !==
        Math.floor((remainingMs - 100) / 1000)
      ) {
        saveState();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    isRunning,
    isPaused,
    targetEndTime,
    initialSeconds,
    handleTimerComplete,
    saveState,
    formatTime,
    setSecondsLeft,
    setTargetEndTime,
    hasAdjustedTimerRef,
  ]);

  return timerRef;
};
