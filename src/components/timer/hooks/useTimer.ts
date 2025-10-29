import { useState, useRef, useEffect, useCallback } from "react";

interface UseTimerProps {
  onComplete: () => void;
  onFormatTime: (seconds: number) => void;
}

export const useTimer = ({ onComplete, onFormatTime }: UseTimerProps) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [initialSeconds, setInitialSeconds] = useState<number>(0);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const timerRef = useRef<number>();

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setInitialSeconds(0);
    setTargetEndTime(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (isRunning && !isPaused && targetEndTime) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remainingMs = targetEndTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

        if (remainingMs <= 0) {
          handleTimerComplete();
          return;
        }

        setSecondsLeft(remainingSeconds);
        onFormatTime(remainingSeconds);
      }, 100);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused, targetEndTime, handleTimerComplete, onFormatTime]);

  const handleVisibilityChange = useCallback(async () => {
    if (!document.hidden && isRunning && !isPaused && targetEndTime) {
      const now = Date.now();
      const remainingSeconds = Math.max(
        0,
        Math.floor((targetEndTime - now) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      onFormatTime(remainingSeconds);

      if (remainingSeconds === 0) {
        handleTimerComplete();
      }
    }
  }, [isRunning, isPaused, targetEndTime, handleTimerComplete, onFormatTime]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  const start = (totalSeconds: number) => {
    const endTime = Date.now() + totalSeconds * 1000;
    setIsRunning(true);
    setIsPaused(false);
    setSecondsLeft(totalSeconds);
    setInitialSeconds(totalSeconds);
    setTargetEndTime(endTime);
  };

  const pause = () => {
    setTargetEndTime(null);
    setIsPaused(true);
  };

  const resume = () => {
    const newEndTime = Date.now() + secondsLeft * 1000;
    setTargetEndTime(newEndTime);
    setIsPaused(false);
  };

  const stop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setSecondsLeft(0);
    setInitialSeconds(0);
    setTargetEndTime(null);
  };

  const addTime = (minutesToAdd: number) => {
    if (!isRunning || !targetEndTime) return;

    const millisecondsToAdd = minutesToAdd * 60 * 1000;
    const newTargetEndTime = targetEndTime + millisecondsToAdd;
    const newInitialSeconds = initialSeconds + minutesToAdd * 60;

    setTargetEndTime(newTargetEndTime);
    setInitialSeconds(newInitialSeconds);

    const now = Date.now();
    const remainingSeconds = Math.max(
      0,
      Math.ceil((newTargetEndTime - now) / 1000),
    );
    setSecondsLeft(remainingSeconds);
    onFormatTime(remainingSeconds);
  };

  const restoreState = (
    savedInitialSeconds: number,
    savedIsRunning: boolean,
    savedIsPaused: boolean,
    savedTargetEndTime?: number,
    pausedSecondsLeft?: number,
  ) => {
    setInitialSeconds(savedInitialSeconds);
    setIsRunning(savedIsRunning);
    setIsPaused(savedIsPaused);

    if (savedIsPaused && pausedSecondsLeft !== undefined) {
      setSecondsLeft(pausedSecondsLeft);
      onFormatTime(pausedSecondsLeft);
      setTargetEndTime(null);
    } else if (savedIsRunning && savedTargetEndTime) {
      const now = Date.now();
      const remainingSeconds = Math.max(
        0,
        Math.floor((savedTargetEndTime - now) / 1000),
      );
      setSecondsLeft(remainingSeconds);
      setTargetEndTime(savedTargetEndTime);
      onFormatTime(remainingSeconds);

      if (remainingSeconds === 0) {
        handleTimerComplete();
      }
    }
  };

  return {
    isRunning,
    isPaused,
    secondsLeft,
    initialSeconds,
    targetEndTime,
    start,
    pause,
    resume,
    stop,
    addTime,
    restoreState,
  };
};
