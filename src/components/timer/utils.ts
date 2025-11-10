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
