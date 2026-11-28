import type { searchTypes } from "@/api/search";

export const bookingMinute = 60_000;
export const musicStep = 30 * bookingMinute;

export function moscowDay(value: number) {
  return new Date(value).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function awareTime(value: string | null | undefined) {
  return (
    typeof value === "string" &&
    /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

// Receipts must contain an exact selection, not just the original available window.
// Validate their own fields; another tab may have claimed a different valid choice.
export function validBookingReceipt(offer: searchTypes.SchemaSignupOffer) {
  if (!validBookingInterval(offer)) return false;
  if (offer.service === "rooms")
    return (
      typeof offer.booking_title === "string" &&
      offer.booking_title.trim().length > 0 &&
      Array.from(offer.booking_title).length <= 100
    );
  const window = offer.music_window!;
  const start = Date.parse(offer.starts_at);
  const end = Date.parse(offer.ends_at!);
  const duration = (end - start) / bookingMinute;
  return (
    start % musicStep === 0 &&
    end % musicStep === 0 &&
    start >= Date.parse(window.starts_at) &&
    start <= Date.parse(window.latest_start_at) &&
    end <= Date.parse(window.ends_at) &&
    duration <= window.max_duration_minutes &&
    (window.duration_minutes == null || duration === window.duration_minutes)
  );
}

// This only validates the offered UI choices. Fresh service checks stay on the server.
export function validBookingInterval(offer: searchTypes.SchemaSignupOffer) {
  if (
    offer.all_day ||
    !awareTime(offer.starts_at) ||
    !awareTime(offer.ends_at) ||
    !(Date.parse(offer.ends_at!) > Date.parse(offer.starts_at))
  )
    return false;
  if (offer.service !== "music") return true;
  const window = offer.music_window;
  if (
    !window ||
    !awareTime(window.starts_at) ||
    !awareTime(window.ends_at) ||
    !awareTime(window.latest_start_at)
  )
    return false;
  const first = Date.parse(window.starts_at);
  const last = Date.parse(window.ends_at);
  const latest = Date.parse(window.latest_start_at);
  const max = window.max_duration_minutes;
  const duration = window.duration_minutes;
  return (
    window.step_minutes === 30 &&
    first % musicStep === 0 &&
    last % musicStep === 0 &&
    first < last &&
    moscowDay(first) === moscowDay(last) &&
    Number.isInteger(max) &&
    max >= 30 &&
    (duration == null ||
      (Number.isInteger(duration) &&
        duration >= 30 &&
        duration % 30 === 0 &&
        duration <= max)) &&
    latest >= first &&
    latest <= last - (duration ?? 30) * bookingMinute
  );
}
