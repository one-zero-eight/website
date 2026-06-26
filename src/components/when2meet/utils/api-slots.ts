import { generateTimeSlots, getSlotKey, parseSlotKey } from "./slots.ts";

/** When2Meet uses Europe/Moscow wall-clock times (see CreationPage timezone field). */
const WHEN2MEET_TIMEZONE_OFFSET = "+03:00";

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

export function getFullDayTimeSlots() {
  return generateTimeSlots(FULL_DAY_TIME_RANGE.start, FULL_DAY_TIME_RANGE.end);
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

export function slotKeyToDateRange(slotKey: string, durationMinutes = 60) {
  const { dateId, time } = parseSlotKey(slotKey);
  const start = new Date(`${dateId}T${time}:00${WHEN2MEET_TIMEZONE_OFFSET}`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return { start, end, scrollTimestamp: start.getTime() };
}
