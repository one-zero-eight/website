import type { Locale } from "@/locales/lib";

/** Prefer app locale when the event has that translation; otherwise first available. */
export function pickPreferredEventLocale(
  available: string[],
  preferred: Locale,
): string | null {
  if (available.length === 0) {
    return null;
  }

  if (available.includes(preferred)) {
    return preferred;
  }

  return available[0] ?? null;
}
