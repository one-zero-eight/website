import { useRef, useEffect } from "react";

export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired");
      }
    } catch (err) {
      console.error("Failed to acquire wake lock:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Wake Lock released");
      } catch (err) {
        console.error("Failed to release wake lock:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  return { requestWakeLock, releaseWakeLock };
};
