import { slotKeyToDateRange } from "./api-slots.ts";
import { getSlotKey, getSlotKeysBetween, parseSlotKey } from "./slots.ts";
import type { MeetingTimeRange } from "./meeting-time.ts";

export const PAST_MEETING_TIME_MESSAGE =
  "The selected start time has passed. Choose another time.";

export function isMeetingTimeInFuture(
  meetingTime: MeetingTimeRange,
  now: number,
) {
  return new Date(meetingTime.start).getTime() > now;
}

export function getFutureMeetingSlotKeys(
  allowedSlots: Set<string>,
  now: number,
) {
  return new Set(
    [...allowedSlots].filter((slotKey) => isMeetingSlotInFuture(slotKey, now)),
  );
}

export function isMeetingSlotInFuture(slotKey: string, now: number) {
  return slotKeyToDateRange(slotKey).start.getTime() > now;
}

export function getAllowedMeetingInterval(
  fromSlotKey: string,
  toSlotKey: string,
  dateIds: string[],
  timeSlots: string[],
  now: number,
  allowedSlots?: Set<string>,
) {
  const { dateId } = parseSlotKey(fromSlotKey);
  const { time } = parseSlotKey(toSlotKey);
  const slotKeys = getSlotKeysBetween(
    fromSlotKey,
    getSlotKey(dateId, time),
    dateIds,
    timeSlots,
  );
  const interval: string[] = [];

  for (const slotKey of slotKeys) {
    if (
      (allowedSlots && !allowedSlots.has(slotKey)) ||
      !isMeetingSlotInFuture(slotKey, now)
    ) {
      break;
    }
    interval.push(slotKey);
  }

  return interval;
}

export function isPastMeetingTimeError(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("httpCode" in error) ||
    error.httpCode !== 400 ||
    !("body" in error) ||
    typeof error.body !== "object" ||
    error.body === null ||
    !("detail" in error.body)
  ) {
    return false;
  }

  const detail = error.body.detail;
  return (
    typeof detail === "object" &&
    detail !== null &&
    "code" in detail &&
    detail.code === "selected_time_in_past"
  );
}
