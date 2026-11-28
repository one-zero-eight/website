import { useEffect, useState } from "react";

export function formatCountdown(seconds: number): string {
  const rest = String(seconds % 60).padStart(2, "0");
  return `${Math.floor(seconds / 60)}:${rest}`;
}

// When the pause ends, as the clock of the user's device shows it
export function formatClock(until: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(until);
}

// The seconds left of the pause, counted down; 0 when there is none or it is over
export function usePauseSecondsLeft(until: number | null): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (until === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (until === null) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}
