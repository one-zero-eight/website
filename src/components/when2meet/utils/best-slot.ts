import type { when2meetTypes } from "@/api/when2meet";
import { parseBackendSlots } from "./api-slots.ts";
import { participantsToUsers } from "./participants.ts";
import { getSlotKey } from "./slots.ts";

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

  const formattedDates = parsed.dates;
  let bestSlotKey: string | null = null;
  let bestCount = 0;

  for (const dateId of formattedDates) {
    for (const time of parsed.timeSlots) {
      const slotKey = getSlotKey(dateId, time);

      if (!allowedSlots.has(slotKey)) {
        continue;
      }

      const count = users.filter((user) => user.slots.has(slotKey)).length;

      if (count > bestCount) {
        bestSlotKey = slotKey;
        bestCount = count;
      }
    }
  }

  return bestCount > 0 ? bestSlotKey : null;
}
