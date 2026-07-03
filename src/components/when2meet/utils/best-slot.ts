import type { when2meetTypes } from "@/api/when2meet";
import type { MeetingUser } from "../types.ts";
import { parseBackendSlots } from "./api-slots.ts";
import {
  countExplicitSlotAvailability,
  participantsToUsers,
} from "./participants.ts";
import { getSlotKey } from "./slots.ts";

export type BestIntersectionResult = {
  slotKeys: Set<string>;
  maxCount: number;
};

export function getBestIntersection(
  users: MeetingUser[],
  dates: string[],
  timeSlots: string[],
  allowedSlots: Set<string>,
  viewedUserIds: Set<string>,
  editingUserId: string | null = null,
  draftSlots: Set<string> = new Set(),
): BestIntersectionResult {
  let maxCount = 0;
  const counts = new Map<string, number>();

  for (const dateId of dates) {
    for (const time of timeSlots) {
      const slotKey = getSlotKey(dateId, time);

      if (!allowedSlots.has(slotKey)) {
        continue;
      }

      const count = countExplicitSlotAvailability(
        users,
        viewedUserIds,
        slotKey,
        editingUserId,
        draftSlots,
      );

      counts.set(slotKey, count);
      maxCount = Math.max(maxCount, count);
    }
  }

  const slotKeys = new Set<string>();

  if (maxCount > 0) {
    for (const [slotKey, count] of counts) {
      if (count === maxCount) {
        slotKeys.add(slotKey);
      }
    }
  }

  return { slotKeys, maxCount };
}

export function getBestMeetingSlotKey(
  event: when2meetTypes.SchemaEventView,
  allowedSlotKeys?: Set<string>,
) {
  const parsed = parseBackendSlots(event.slots);
  const users = participantsToUsers(event.participants);
  const allowedSlots =
    allowedSlotKeys && allowedSlotKeys.size > 0
      ? allowedSlotKeys
      : new Set(parsed.slotKeys);

  if (parsed.dates.length === 0 || parsed.timeSlots.length === 0) {
    return null;
  }

  const viewedUserIds = new Set(users.map((user) => user.id));
  const { slotKeys, maxCount } = getBestIntersection(
    users,
    parsed.dates,
    parsed.timeSlots,
    allowedSlots,
    viewedUserIds,
  );

  if (maxCount <= 0) {
    return null;
  }

  return [...slotKeys].sort()[0] ?? null;
}
