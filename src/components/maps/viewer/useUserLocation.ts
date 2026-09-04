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
 * `start()` is called, so we only prompt for permission on an explicit action.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<UserGeoPosition | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const watchIdRef = useRef<number | null>(null);

  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("idle");
    setPosition(null);
  }, []);

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
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        if (err.code === err.PERMISSION_DENIED) stop();
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, [supported, stop]);

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
