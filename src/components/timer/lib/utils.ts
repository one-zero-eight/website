import { useCallback, useMemo, useRef, useState } from "react";
import { useEventListener } from "usehooks-ts";

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired");
      }
    } catch (err) {
      console.error("Failed to acquire wake lock:", err);
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Wake Lock released");
      } catch (err) {
        console.error("Failed to release wake lock:", err);
      }
    }
  }, []);

  return useMemo(
    () => ({
      wakeLockRef,
      request,
      release,
    }),
    [release, request],
  );
}

export function useFullscreen() {
  const [isFullScreen, setIsFullScreen] = useState(
    !!document.fullscreenElement,
  );
  const documentRef = useRef<Document>(document);

  useEventListener(
    "fullscreenchange",
    () => setIsFullScreen(!!document.fullscreenElement),
    documentRef,
  );

  return isFullScreen;
}

interface UseSaveState {
  title: string;
  initialSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  targetEndTime: number | null;
}
export function useSaveState({
  title,
  initialSeconds,
  isRunning,
  isPaused,
  targetEndTime,
}: UseSaveState) {
  const saveState = useCallback(
    (seconds?: number) => {
      const stateToSave: any = {
        title,
        initialSeconds,
        isRunning,
        isPaused,
      };

      if (isPaused && seconds !== undefined) {
        // When paused, save the current seconds left
        stateToSave.pausedSecondsLeft = seconds;
      } else if (targetEndTime) {
        // When running, save the target end time
        stateToSave.targetEndTime = targetEndTime;
      }

      localStorage.setItem("timerState", JSON.stringify(stateToSave));
    },
    [title, isRunning, isPaused, initialSeconds, targetEndTime],
  );
  return { saveState };
}

export const updateTextAreaHeight = (target?: HTMLTextAreaElement | null) => {
  if (target) {
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }
};
