import { useCallback, useEffect, useRef, useState } from "react";

export type UserGeoPosition = {
  lat: number;
  lon: number;
  accuracyM: number;
  /** Degrees clockwise from north, if the device reports it. */
  heading: number | null;
};

export type UserLocationStatus =
  | "idle"
  | "locating"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

/**
 * Watches the device's GPS position via the Geolocation API. Inert until
 * `start()` is called. The interactive maps page (`MapView`) auto-starts it on
 * load so location is on by default; embedded previews leave it opt-in and only
 * `start()` on an explicit action.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<UserGeoPosition | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const watchIdRef = useRef<number | null>(null);

  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  /** Drop the watch without touching `status`, so a failure can keep its own. */
  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    setStatus("idle");
    setPosition(null);
  }, [clearWatch]);

  const start = useCallback(() => {
    if (!supported) {
      setStatus("unavailable");
      return;
    }
    if (watchIdRef.current !== null) return;

    setStatus("locating");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          heading:
            pos.coords.heading != null && !Number.isNaN(pos.coords.heading)
              ? pos.coords.heading
              : null,
        });
        setStatus("active");
      },
      (err) => {
        // A denial ends the watch, but calling stop() here would reset the
        // status to "idle" in the same batch and the denial would never be
        // observable by callers.
        if (err.code === err.PERMISSION_DENIED) {
          clearWatch();
          setPosition(null);
        }
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, [supported, clearWatch]);

  // Clear the watch on unmount.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return { position, status, supported, start, stop };
}
