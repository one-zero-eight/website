import type { CSSProperties } from "react";
import { formatHour, parseHour } from "./dates.ts";
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

export function areConsecutiveDateIds(
  previousDateId: string,
  nextDateId: string,
) {
  const dayAfterPrevious = new Date(`${previousDateId}T12:00:00`);
  dayAfterPrevious.setDate(dayAfterPrevious.getDate() + 1);

  return dayAfterPrevious.toLocaleDateString("en-CA") === nextDateId;
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
  return [...dateIds]
    .sort((a, b) => a.localeCompare(b))
    .map((dateId) => {
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

function getTimeZoneDateTime(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    dateId: `${values.year}-${values.month}-${values.day}`,
    timeLabel: `${values.hour}:${values.minute}`,
    minutes:
      Number(values.hour) * 60 +
      Number(values.minute) +
      Number(values.second) / 60,
  };
}

export function getDateIdInTimeZone(timestamp: number, timeZone: string) {
  return getTimeZoneDateTime(timestamp, timeZone).dateId;
}

export function getCurrentTimeGridIndicator(
  timestamp: number,
  timeZone: string,
  timeSlots: string[],
) {
  if (timeSlots.length === 0) {
    return null;
  }

  const {
    dateId,
    timeLabel,
    minutes: currentMinutes,
  } = getTimeZoneDateTime(timestamp, timeZone);
  const slotMinutes = timeSlots.map(timeToMinutes);
  const defaultDuration =
    slotMinutes
      .slice(1)
      .map((minutes, index) => minutes - slotMinutes[index])
      .find((duration) => duration > 0) ?? 30;

  for (let index = 0; index < timeSlots.length; index++) {
    const slotStart = slotMinutes[index];
    const nextSlotStart = slotMinutes[index + 1];
    const slotEnd =
      nextSlotStart !== undefined && nextSlotStart > slotStart
        ? nextSlotStart
        : slotStart + defaultDuration;

    if (currentMinutes < slotStart || currentMinutes >= slotEnd) {
      continue;
    }

    return {
      dateId,
      timeLabel,
      slotTime: timeSlots[index],
      offsetPercent:
        ((currentMinutes - slotStart) / (slotEnd - slotStart)) * 100,
    };
  }

  return null;
}

function timeToMinutes(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
}

export function getSlotAvailabilityRatio(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  return Math.min(1, count / maxCount);
}

/**
 * Maximum opacity for heatmap slot fills. Kept below 100% so outlines and
 * labels remain visible over the brightest heatmap slot.
 */
const MAX_HEATMAP_OPACITY_PERCENT = 75;

export function getSlotHeatmapAppearance(
  count: number,
  maxCount: number,
): { className?: string; style?: CSSProperties } {
  if (count <= 0) {
    return { className: "bg-base-100 hover:bg-primary/10" };
  }

  const ratio = getSlotAvailabilityRatio(count, maxCount);
  const percent = Math.round(ratio * MAX_HEATMAP_OPACITY_PERCENT);

  return {
    className: ratio >= 1 ? "text-primary-content" : undefined,
    style: {
      backgroundColor: `color-mix(in oklch, var(--color-primary) ${percent}%, transparent)`,
    },
  };
}

export function getSlotHeatmapAppearanceColorblindSafe(
  count: number,
  maxCount: number,
): { className?: string; style?: CSSProperties } {
  if (count <= 0) {
    return { className: "bg-base-100" };
  }

  const ratio = getSlotAvailabilityRatio(count, maxCount);

  if (ratio >= 1) {
    return { className: "bg-primary/75 text-primary-content" };
  }

  if (ratio >= 0.75) {
    return { className: "bg-primary/55" };
  }

  if (ratio >= 0.5) {
    return { className: "bg-primary/35" };
  }

  if (ratio >= 0.25) {
    return { className: "bg-primary/20" };
  }

  return { className: "bg-primary/10" };
}
