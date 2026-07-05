import { generateTimeSlots, getSlotKey, parseSlotKey } from "./slots.ts";

/** When2Meet uses Europe/Moscow wall-clock times (see CreationPage timezone field). */
const WHEN2MEET_TIMEZONE_OFFSET = "+03:00";

import { formatHour } from "./dates.ts";

const DEFAULT_DERIVED_TIME_RANGE = {
  start: "08:00",
  end: "19:00",
} as const;

const SLOT_INTERVAL_MINUTES = 30;

function parseTimeToMinutes(value: string) {
  const [hours, minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function minutesToTimeEnd(minutes: number) {
  if (minutes >= 24 * 60) {
    return "24:00";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return formatHour(hours, remainingMinutes);
}

export function deriveTimeRangeFromSlots(timeSlots: string[]) {
  if (timeSlots.length === 0) {
    return { ...DEFAULT_DERIVED_TIME_RANGE };
  }

  const sortedTimes = [...timeSlots].sort();
  const start = sortedTimes[0];
  const end = minutesToTimeEnd(
    parseTimeToMinutes(sortedTimes[sortedTimes.length - 1]) +
      SLOT_INTERVAL_MINUTES,
  );

  return { start, end };
}

export function slotKeyToBackend(slotKey: string) {
  const { dateId, time } = parseSlotKey(slotKey);
  return `${dateId}T${time}:00Z`;
}

export function createBackendSlotLookup(slots: string[]) {
  const lookup = new Map<string, string>();

  for (const slot of slots) {
    lookup.set(backendSlotToSlotKey(slot), slot);
  }

  return lookup;
}

export function slotKeysToBackendSlots(
  slotKeys: Iterable<string>,
  lookup: Map<string, string>,
) {
  return [...slotKeys]
    .map((slotKey) => lookup.get(slotKey) ?? slotKeyToBackend(slotKey))
    .sort();
}

export function backendSlotToSlotKey(slot: string) {
  if (slot.includes("_")) {
    return slot;
  }

  if (slot.includes("T")) {
    const [datePart, timePart] = slot.split("T");
    const time = timePart.slice(0, 5);
    return getSlotKey(datePart, time);
  }

  const parsedDate = new Date(slot);

  if (!Number.isNaN(parsedDate.getTime())) {
    const dateId = parsedDate.toLocaleDateString("en-CA");
    const hours = parsedDate.getHours().toString().padStart(2, "0");
    const minutes = parsedDate.getMinutes().toString().padStart(2, "0");
    return getSlotKey(dateId, `${hours}:${minutes}`);
  }

  return slot;
}

export function parseBackendSlots(slots: string[]) {
  const slotKeys = slots.map(backendSlotToSlotKey);
  const dates = new Set<string>();
  const times = new Set<string>();

  for (const slotKey of slotKeys) {
    const { dateId, time } = parseSlotKey(slotKey);
    dates.add(dateId);
    times.add(time);
  }

  return {
    slotKeys,
    dates: [...dates].sort(),
    timeSlots: [...times].sort(),
  };
}

export function buildSlotsFromDatesAndRange(
  dates: Set<string>,
  start: string,
  end: string,
) {
  const times = generateTimeSlots(start, end);
  const slots: string[] = [];

  for (const dateId of dates) {
    for (const time of times) {
      slots.push(slotKeyToBackend(getSlotKey(dateId, time)));
    }
  }

  return slots.sort();
}

export const FULL_DAY_TIME_RANGE = {
  start: "00:00",
  end: "24:00",
} as const;

export const FULL_DAY_SLOT_INTERVAL_MINUTES = 60;

export function getFullDayTimeSlots() {
  return generateTimeSlots(
    FULL_DAY_TIME_RANGE.start,
    FULL_DAY_TIME_RANGE.end,
    FULL_DAY_SLOT_INTERVAL_MINUTES,
  );
}

export function buildFullDaySlotsFromDates(dates: Set<string>) {
  return buildSlotsFromDatesAndRange(
    dates,
    FULL_DAY_TIME_RANGE.start,
    FULL_DAY_TIME_RANGE.end,
  );
}

export function buildFullDaySlotKeys(dates: string[]) {
  const slotKeys = new Set<string>();

  for (const dateId of dates) {
    for (const time of getFullDayTimeSlots()) {
      slotKeys.add(getSlotKey(dateId, time));
    }
  }

  return slotKeys;
}

/**
 * Setup screen uses 1-hour blocks for easier selection, but the meeting view
 * keeps 30-minute granularity. Expand each selected hourly slot key into its
 * two half-hour companions so saved data stays at 30-min resolution.
 */
export function expandHourlySlotKeysToHalfHour(slotKeys: Iterable<string>) {
  const expanded = new Set<string>();

  for (const slotKey of slotKeys) {
    const { dateId, time } = parseSlotKey(slotKey);
    const [hours, minutes = "0"] = time.split(":");
    const totalMinutes = Number(hours) * 60 + Number(minutes);

    expanded.add(slotKey);

    const companionMinutes =
      totalMinutes % 60 === 0 ? totalMinutes + 30 : totalMinutes - 30;

    if (companionMinutes >= 0 && companionMinutes < 24 * 60) {
      expanded.add(
        getSlotKey(
          dateId,
          formatHour(Math.floor(companionMinutes / 60), companionMinutes % 60),
        ),
      );
    }
  }

  return expanded;
}

/**
 * Inverse of expandHourlySlotKeysToHalfHour: collapse 30-min slot keys back to
 * their hourly parent so they can be matched against the 1-hour setup grid.
 */
export function collapseHalfHourSlotKeysToHourly(slotKeys: Iterable<string>) {
  const collapsed = new Set<string>();

  for (const slotKey of slotKeys) {
    const { dateId, time } = parseSlotKey(slotKey);
    const [hours] = time.split(":");
    collapsed.add(getSlotKey(dateId, formatHour(Number(hours), 0)));
  }

  return collapsed;
}

export function slotKeyToDateRange(slotKey: string, durationMinutes = 60) {
  const { dateId, time } = parseSlotKey(slotKey);
  const start = new Date(`${dateId}T${time}:00${WHEN2MEET_TIMEZONE_OFFSET}`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return { start, end, scrollTimestamp: start.getTime() };
}
