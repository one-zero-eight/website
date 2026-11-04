import { plural, t } from "@lingui/core/macro";

import { dayKey, formatDisplayDate } from "./timetableViewerModel.ts";

function weekdayLoadLabel(day: ReturnType<typeof dayKey>): string {
  switch (day) {
    case "Mon":
      return t`on Mondays`;
    case "Tue":
      return t`on Tuesdays`;
    case "Wed":
      return t`on Wednesdays`;
    case "Thu":
      return t`on Thursdays`;
    case "Fri":
      return t`on Fridays`;
    case "Sat":
      return t`on Saturdays`;
    case "Sun":
      return t`on Sundays`;
  }
}

export function formatPickerLoadHint(
  dates: string[],
  countForDate: (date: string) => number,
  weekly: boolean,
): string {
  const uniqueDates = [...new Set(dates)];
  if (!uniqueDates.length) return t`No class dates`;

  const counts = uniqueDates.map(countForDate);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const countLabel =
    minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`;
  const weekdays = new Set(uniqueDates.map(dayKey));
  const period = weekly
    ? weekdays.size === 1
      ? weekdayLoadLabel(dayKey(uniqueDates[0]))
      : t`on class days`
    : t`per day`;
  const lessons = plural(maximum, {
    one: `${countLabel} class`,
    other: `${countLabel} classes`,
  });

  return `${lessons} ${period}`;
}

export function formatPickerConflictDates(dates: string[]): string {
  if (!dates.length) return t`No class dates`;
  return [...new Set(dates)]
    .sort()
    .map((date) => formatDisplayDate(date))
    .join(", ");
}
