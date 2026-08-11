import moment from "moment";

/** Format for UI display, e.g. 13.08.2026 18:00 */
export function formatEventDateTime(value: string | null | undefined) {
  if (!value) {
    return "TBA";
  }

  return moment(value).format("DD.MM.YYYY HH:mm");
}

/** End datetime from start + duration hours; null if either is missing. */
export function getEventEndsAt(
  startsAt: string | null | undefined,
  durationHours: number | null | undefined,
) {
  if (!startsAt || durationHours === null || durationHours === undefined) {
    return null;
  }

  return moment(startsAt).add(durationHours, "hours").toISOString();
}

/** Compact range, e.g. 13 AUG 18:00 – 19:00 */
export function formatEventDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  if (!startsAt) {
    return "TBA";
  }

  const start = moment(startsAt);
  if (!endsAt) {
    return start.format("D MMM HH:mm").toUpperCase();
  }

  const end = moment(endsAt);
  if (start.isSame(end, "day")) {
    return `${start.format("D MMM HH:mm").toUpperCase()} – ${end.format("HH:mm")}`;
  }

  return `${start.format("D MMM HH:mm").toUpperCase()} – ${end.format("D MMM HH:mm").toUpperCase()}`;
}

/** Value for `<input type="datetime-local" />` in local timezone */
export function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return moment(value).format("YYYY-MM-DDTHH:mm");
}

/**
 * Convert datetime-local input into an ISO string with timezone offset.
 * Backend rejects naive datetimes.
 */
export function fromDatetimeLocalValue(value: string) {
  return moment(value).format("YYYY-MM-DDTHH:mm:ssZ");
}

export function isDatetimeLocalInPast(value: string) {
  if (!value) {
    return true;
  }

  return moment(value).isBefore(moment());
}
