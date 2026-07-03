import {
  getSlotAvailabilityRatio,
  getSlotHeatmapAppearance,
  getSlotHeatmapAppearanceColorblindSafe,
  getSlotKeysBetween,
} from "./slots.ts";
import { getBestIntersection } from "./best-slot.ts";
import {
  countExplicitSlotAvailability,
  userHasExplicitAvailability,
} from "./participants.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectPercent(count: number, maxCount: number, percent: number) {
  const appearance = getSlotHeatmapAppearance(count, maxCount);

  assert(
    appearance.style?.backgroundColor ===
      `color-mix(in oklch, var(--color-primary) ${percent}%, transparent)`,
    `count=${count}/${maxCount}: expected ${percent}% mix, got ${appearance.style?.backgroundColor}`,
  );
}

assert(getSlotAvailabilityRatio(0, 10) === 0, "zero count → ratio 0");
assert(getSlotAvailabilityRatio(4, 8) === 0.5, "4/8 → ratio 0.5");
assert(getSlotAvailabilityRatio(10, 10) === 1, "full availability → ratio 1");
assert(
  getSlotAvailabilityRatio(12, 10) === 1,
  "count above max clamps to ratio 1",
);

const emptyAppearance = getSlotHeatmapAppearance(0, 10);
assert(
  emptyAppearance.className === "bg-base-100 hover:bg-primary/10",
  "empty slot keeps base background class",
);
assert(!emptyAppearance.style, "empty slot has no inline style");

expectPercent(1, 1, 100);
expectPercent(1, 2, 50);
expectPercent(1, 3, 33);
expectPercent(1, 10, 10);
expectPercent(3, 10, 30);
expectPercent(5, 10, 50);
expectPercent(7, 10, 70);
expectPercent(10, 10, 100);
expectPercent(3, 7, 43);
expectPercent(50, 100, 50);
expectPercent(99, 100, 99);

const fullAppearance = getSlotHeatmapAppearance(25, 25);
assert(
  fullAppearance.className === "text-primary-content",
  "full availability uses primary content text color",
);

const partialAppearance = getSlotHeatmapAppearance(12, 25);
assert(
  !partialAppearance.className,
  "partial availability does not force primary content text color",
);

assert(
  getSlotHeatmapAppearanceColorblindSafe(0, 10).className === "bg-base-100",
  "colorblind-safe empty slot uses base background",
);
assert(
  !getSlotHeatmapAppearanceColorblindSafe(0, 10).style,
  "colorblind-safe empty slot has no inline style",
);
assert(
  getSlotHeatmapAppearanceColorblindSafe(3, 10).className === "bg-primary/25",
  "colorblind-safe low availability uses stepped class",
);
assert(
  getSlotHeatmapAppearanceColorblindSafe(10, 10).className ===
    "bg-primary text-primary-content",
  "colorblind-safe full availability uses solid primary",
);

const users = [
  { id: "a", name: "A", slots: new Set(["2026-07-16_09:00"]) },
  {
    id: "b",
    name: "B",
    slots: new Set(["2026-07-16_09:00", "2026-07-16_10:00"]),
  },
  { id: "c", name: "C", slots: new Set(["2026-07-16_10:00"]) },
];
const allowedSlots = new Set([
  "2026-07-16_09:00",
  "2026-07-16_09:30",
  "2026-07-16_10:00",
]);
const viewedUserIds = new Set(["a", "b", "c"]);
const bestIntersection = getBestIntersection(
  users,
  ["2026-07-16"],
  ["09:00", "09:30", "10:00"],
  allowedSlots,
  viewedUserIds,
);

assert(bestIntersection.maxCount === 2, "best intersection count is 2");
assert(
  bestIntersection.slotKeys.has("2026-07-16_09:00"),
  "09:00 is tied for best intersection",
);
assert(
  bestIntersection.slotKeys.has("2026-07-16_10:00"),
  "10:00 is tied for best intersection",
);
assert(
  bestIntersection.slotKeys.size === 2,
  "only tied slots are marked as best intersection",
);

const usersWithNonResponder = [
  ...users,
  { id: "d", name: "D", slots: new Set<string>() },
];
const bestIntersectionWithoutNonResponder = getBestIntersection(
  usersWithNonResponder,
  ["2026-07-16"],
  ["09:00", "09:30", "10:00"],
  allowedSlots,
  new Set(["a", "b", "c", "d"]),
);

assert(
  bestIntersectionWithoutNonResponder.maxCount === bestIntersection.maxCount,
  "participants without explicit slots do not increase intersection counts",
);

assert(
  !userHasExplicitAvailability(
    { id: "d", name: "D", slots: new Set() },
    null,
    new Set(),
  ),
  "empty availability is not explicit",
);
assert(
  countExplicitSlotAvailability(
    usersWithNonResponder,
    new Set(["a", "b", "c", "d"]),
    "2026-07-16_09:00",
    null,
    new Set(),
  ) === 2,
  "slot count ignores participants without explicit availability",
);

const dates = ["2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
const times = ["09:00", "09:30", "10:00", "10:30"];

assert(
  getSlotKeysBetween("2026-07-16_09:00", "2026-07-16_09:00", dates, times).join(
    ",",
  ) === "2026-07-16_09:00",
  "same slot returns itself",
);

assert(
  getSlotKeysBetween("2026-07-16_09:00", "2026-07-18_09:00", dates, times).join(
    ",",
  ) === "2026-07-16_09:00,2026-07-17_09:00,2026-07-18_09:00",
  "horizontal drag fills skipped date cells",
);

assert(
  getSlotKeysBetween("2026-07-16_09:00", "2026-07-16_10:30", dates, times).join(
    ",",
  ) === "2026-07-16_09:00,2026-07-16_09:30,2026-07-16_10:00,2026-07-16_10:30",
  "vertical drag fills skipped time cells",
);

assert(
  getSlotKeysBetween(
    "2026-07-16_09:00",
    "2026-07-18_10:30",
    dates,
    times,
  ).includes("2026-07-17_09:30"),
  "diagonal drag fills intermediate cells",
);

console.log("when2meet heatmap opacity tests passed");
