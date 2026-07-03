import type { CSSProperties } from "react";
import type { Availability, TimeRangeSelection } from "./dates.ts";
import { formatHour, groupDatesByYearMonth, parseHour } from "./dates.ts";
import type { MeetingDate } from "../types.ts";

export function getSlotKey(dateId: string, time: string) {
  return `${dateId}_${time}`;
}

export function parseSlotKey(slotKey: string) {
  const separatorIndex = slotKey.indexOf("_");
  const dateId = slotKey.slice(0, separatorIndex);
  const time = slotKey.slice(separatorIndex + 1);

  return { dateId, time };
}

export function getSlotKeysBetween(
  fromSlotKey: string,
  toSlotKey: string,
  dateIds: string[],
  timeSlotsList: string[],
) {
  if (fromSlotKey === toSlotKey) {
    return [toSlotKey];
  }

  const from = parseSlotKey(fromSlotKey);
  const to = parseSlotKey(toSlotKey);
  const startDateIndex = dateIds.indexOf(from.dateId);
  const startTimeIndex = timeSlotsList.indexOf(from.time);
  const endDateIndex = dateIds.indexOf(to.dateId);
  const endTimeIndex = timeSlotsList.indexOf(to.time);

  if (
    startDateIndex < 0 ||
    startTimeIndex < 0 ||
    endDateIndex < 0 ||
    endTimeIndex < 0
  ) {
    return [toSlotKey];
  }

  const slotKeys: string[] = [];
  let dateIndex = startDateIndex;
  let timeIndex = startTimeIndex;
  const deltaX = Math.abs(endDateIndex - startDateIndex);
  const deltaY = Math.abs(endTimeIndex - startTimeIndex);
  const stepX = startDateIndex < endDateIndex ? 1 : -1;
  const stepY = startTimeIndex < endTimeIndex ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    const dateId = dateIds[dateIndex];
    const time = timeSlotsList[timeIndex];

    if (dateId && time) {
      slotKeys.push(getSlotKey(dateId, time));
    }

    if (dateIndex === endDateIndex && timeIndex === endTimeIndex) {
      break;
    }

    const doubleError = 2 * error;

    if (doubleError > -deltaY) {
      error -= deltaY;
      dateIndex += stepX;
    }

    if (doubleError < deltaX) {
      error += deltaX;
      timeIndex += stepY;
    }
  }

  return slotKeys;
}

export function generateTimeSlots(
  start: string,
  end: string,
  intervalMinutes = 30,
) {
  const startMinutes = parseHour(start) * 60;
  const endMinutes = parseHour(end) * 60;
  const slots: string[] = [];

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += intervalMinutes
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(formatHour(hour, minute));
  }

  return slots;
}

export function formatMeetingDates(dateIds: string[]): MeetingDate[] {
  return [...dateIds].sort().map((dateId) => {
    const date = new Date(`${dateId}T12:00:00`);

    return {
      id: dateId,
      monthDay: date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      weekDay: date.toLocaleDateString("en", { weekday: "short" }),
    };
  });
}

export function formatDateRangeLabel(dates: MeetingDate[]) {
  if (dates.length === 0) {
    return "No dates";
  }

  if (dates.length === 1) {
    return dates[0].monthDay;
  }

  return `${dates[0].monthDay} - ${dates[dates.length - 1].monthDay}`;
}

export function slotKeysToAvailability(slotKeys: Iterable<string>) {
  const slotsByDate = new Map<string, string[]>();

  for (const slotKey of slotKeys) {
    const { dateId, time } = parseSlotKey(slotKey);
    const times = slotsByDate.get(dateId) ?? [];
    times.push(time);
    slotsByDate.set(dateId, times);
  }

  const availability: Availability = {};

  for (const [dateId, times] of slotsByDate) {
    const sortedTimes = [...times].sort();
    const ranges: TimeRangeSelection[] = [];

    let rangeStart = sortedTimes[0];
    let previousMinutes = timeToMinutes(sortedTimes[0]);

    for (let index = 1; index <= sortedTimes.length; index++) {
      const currentTime = sortedTimes[index];
      const currentMinutes = currentTime
        ? timeToMinutes(currentTime)
        : Number.NaN;

      if (currentMinutes - previousMinutes === 30) {
        previousMinutes = currentMinutes;
        continue;
      }

      ranges.push({
        start: rangeStart,
        end: minutesToTime(previousMinutes + 30),
      });

      if (!currentTime) {
        break;
      }

      rangeStart = currentTime;
      previousMinutes = currentMinutes;
    }

    const [yearStr, monthStr, dayStr] = dateId.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!availability[year]) {
      availability[year] = {};
    }

    if (!availability[year][month]) {
      availability[year][month] = {};
    }

    availability[year][month][day] = ranges;
  }

  return availability;
}

export function availabilityToSlotKeys(
  availability: Availability,
  timeRange: TimeRangeSelection,
) {
  const slotKeys = new Set<string>();
  const allowedSlots = new Set(
    generateTimeSlots(timeRange.start, timeRange.end),
  );

  for (const year in availability) {
    for (const month in availability[year]) {
      for (const day in availability[year][month]) {
        const dateId = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const ranges = availability[year][month][day];

        for (const range of ranges) {
          const rangeSlots = generateTimeSlots(range.start, range.end);

          for (const time of rangeSlots) {
            if (allowedSlots.has(time)) {
              slotKeys.add(getSlotKey(dateId, time));
            }
          }
        }
      }
    }
  }

  return slotKeys;
}

export function createBaseAvailability(
  dates: Set<string>,
  timeRange: TimeRangeSelection,
) {
  return groupDatesByYearMonth(dates, timeRange);
}

function timeToMinutes(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
}

function minutesToTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatHour(hour, minute);
}

export function getSlotAvailabilityRatio(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  return Math.min(1, count / maxCount);
}

export function getSlotHeatmapAppearance(
  count: number,
  maxCount: number,
): { className?: string; style?: CSSProperties } {
  if (count <= 0) {
    return { className: "bg-base-100 hover:bg-primary/10" };
  }

  const ratio = getSlotAvailabilityRatio(count, maxCount);
  const percent = Math.round(ratio * 100);

  return {
    className: ratio >= 1 ? "text-primary-content" : undefined,
    style: {
      backgroundColor: `color-mix(in oklch, var(--color-primary) ${percent}%, transparent)`,
    },
  };
}
