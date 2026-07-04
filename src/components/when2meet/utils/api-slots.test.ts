import { deriveTimeRangeFromSlots } from "./api-slots.ts";

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

console.log("api-slots.test.ts passed");
