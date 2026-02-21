import { useEffect } from "react";

interface UseTimerRestoreProps {
  setTitle: (title: string) => void;
  setInitialSeconds: (seconds: number) => void;
  setSecondsLeft: (seconds: number) => void;
  setTargetEndTime: (time: number | null) => void;
  setIsRunning: (running: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  formatTime: (seconds: number) => void;
  handleTimerComplete: () => void;
}

export const useTimerRestore = ({
  setTitle,
  setInitialSeconds,
  setSecondsLeft,
  setTargetEndTime,
  setIsRunning,
  setIsPaused,
  formatTime,
  handleTimerComplete,
}: UseTimerRestoreProps) => {
  useEffect(() => {
    const savedState = localStorage.getItem("timerState");
    if (!savedState) return;

    try {
      const {
        title: savedTitle,
        targetEndTime: savedTargetEndTime,
        initialSeconds: savedInitialSeconds = 0,
        isRunning: savedIsRunning,
        isPaused: savedIsPaused,
        pausedSecondsLeft,
      } = JSON.parse(savedState);

      setTitle(savedTitle || "");
      setInitialSeconds(savedInitialSeconds);

      if (savedIsPaused && pausedSecondsLeft !== undefined) {
        setSecondsLeft(pausedSecondsLeft);
        formatTime(pausedSecondsLeft);
        setTargetEndTime(null);
        setIsRunning(true);
        setIsPaused(true);
      } else if (savedIsRunning && savedTargetEndTime) {
        const now = Date.now();
        const remainingSeconds = Math.max(
          0,
          Math.round((savedTargetEndTime - now) / 1000),
        );

        if (remainingSeconds === 0) {
          handleTimerComplete();
        } else {
          setSecondsLeft(remainingSeconds);
          formatTime(remainingSeconds);
          setTargetEndTime(savedTargetEndTime);
          setIsRunning(true);
          setIsPaused(false);
        }
      }
    } catch (error) {
      console.error("Failed to restore timer state:", error);
      localStorage.removeItem("timerState");
    }
  }, [
    handleTimerComplete,
    formatTime,
    setTitle,
    setInitialSeconds,
    setSecondsLeft,
    setTargetEndTime,
    setIsRunning,
    setIsPaused,
  ]);
};
