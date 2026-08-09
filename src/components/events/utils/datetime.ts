import moment from "moment";

/** Format for UI display, e.g. 13.08.2026 18:00 */
export function formatEventDateTime(value: string | null | undefined) {
  if (!value) {
    return "TBA";
  }

  return moment(value).format("DD.MM.YYYY HH:mm");
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
