import type { MeetingUser } from "../types.ts";
import { countExplicitSlotAvailability } from "./participants.ts";
import { getSlotKey } from "./slots.ts";

type BestIntersectionResult = {
  slotKeys: Set<string>;
  maxCount: number;
};

function getSlotAvailabilityCounts(
  users: MeetingUser[],
  dates: string[],
  timeSlots: string[],
  allowedSlots: Set<string>,
  viewedUserIds: Set<string>,
  editingUserId: string | null = null,
  draftSlots: Set<string> = new Set(),
) {
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

  return { counts, maxCount };
}

export function getBestIntersection(
  users: MeetingUser[],
  dates: string[],
  timeSlots: string[],
  allowedSlots: Set<string>,
  viewedUserIds: Set<string>,
  editingUserId: string | null = null,
  draftSlots: Set<string> = new Set(),
): BestIntersectionResult {
  const { counts, maxCount } = getSlotAvailabilityCounts(
    users,
    dates,
    timeSlots,
    allowedSlots,
    viewedUserIds,
    editingUserId,
    draftSlots,
  );

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

export function getIntersectionAtMinParticipants(
  users: MeetingUser[],
  dates: string[],
  timeSlots: string[],
  allowedSlots: Set<string>,
  viewedUserIds: Set<string>,
  minParticipants: number,
  editingUserId: string | null = null,
  draftSlots: Set<string> = new Set(),
): BestIntersectionResult {
  const { counts, maxCount } = getSlotAvailabilityCounts(
    users,
    dates,
    timeSlots,
    allowedSlots,
    viewedUserIds,
    editingUserId,
    draftSlots,
  );

  const slotKeys = new Set<string>();

  for (const [slotKey, count] of counts) {
    if (count > 0 && count >= Math.max(minParticipants, 1)) {
      slotKeys.add(slotKey);
    }
  }

  return { slotKeys, maxCount };
}
