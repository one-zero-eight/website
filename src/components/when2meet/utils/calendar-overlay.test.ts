import { slotKeyToDateRange } from "./api-slots.ts";
import {
  buildCalendarSlotOverlay,
  getCalendarConflictSlotKeys,
} from "./calendar-overlay.ts";
import { getSlotKey } from "./slots.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const slotKey = getSlotKey("2026-07-03", "10:00");
const { start, end } = slotKeyToDateRange(slotKey);

const slotEvents = buildCalendarSlotOverlay(
  [
    {
      title: "Lecture",
      start,
      end,
    },
  ],
  ["2026-07-03"],
  ["10:00", "10:30"],
  new Set([slotKey]),
);

assert(
  slotEvents.get(slotKey)?.[0] === "Lecture",
  "Expected overlapping calendar event on slot",
);

const conflictSlotKeys = getCalendarConflictSlotKeys(
  new Set([slotKey]),
  slotEvents,
);

assert(
  conflictSlotKeys.has(slotKey),
  "Expected selected slot to be marked as calendar conflict",
);

console.log("when2meet calendar overlay tests passed");
