import {
  deriveTimeRangeFromSlots,
  meetingTimeToSlotKeys,
  slotKeysToMeetingTime,
} from "./api-slots.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  deriveTimeRangeFromSlots([]).start === "08:00" &&
    deriveTimeRangeFromSlots([]).end === "19:00",
  "Expected default time range for empty slots",
);

assert(
  deriveTimeRangeFromSlots(["10:00", "09:30", "10:30"]).start === "09:30" &&
    deriveTimeRangeFromSlots(["10:00", "09:30", "10:30"]).end === "11:00",
  "Expected derived range from slot times",
);

assert(
  deriveTimeRangeFromSlots(["23:00", "23:30"]).end === "24:00",
  "Expected end time to cap at 24:00",
);

const selectedMeetingTime = slotKeysToMeetingTime(
  ["2026-07-03_10:00"],
  ["10:00", "10:30", "11:00"],
);

assert(
  selectedMeetingTime?.start === "2026-07-03T07:00:00.000Z",
  "Expected selected meeting start to preserve Europe/Moscow wall-clock time",
);

assert(
  selectedMeetingTime?.end === "2026-07-03T07:30:00.000Z",
  "Expected single selected slot to end after exactly 30 minutes",
);

const selectedSlotKeys = meetingTimeToSlotKeys(
  {
    start: "2026-07-03T07:00:00.000Z",
    end: "2026-07-03T08:00:00.000Z",
  },
  ["2026-07-03"],
  ["10:00", "10:30", "11:00"],
);

assert(
  selectedSlotKeys.has("2026-07-03_10:00") &&
    selectedSlotKeys.has("2026-07-03_10:30") &&
    !selectedSlotKeys.has("2026-07-03_11:00"),
  "Expected backend meeting time to map back to covered 30-minute slots",
);

console.log("api-slots.test.ts passed");
