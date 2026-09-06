import { dayKey, formatDisplayDate } from "./timetableViewerModel.ts";

const WEEKDAY_LOAD_LABELS = {
  Mon: "по понедельникам",
  Tue: "по вторникам",
  Wed: "по средам",
  Thu: "по четвергам",
  Fri: "по пятницам",
  Sat: "по субботам",
  Sun: "по воскресеньям",
};

function lessonNoun(count: number): string {
  const lastTwoDigits = count % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "занятий";
  const lastDigit = count % 10;
  if (lastDigit === 1) return "занятие";
  if (lastDigit >= 2 && lastDigit <= 4) return "занятия";
  return "занятий";
}

export function formatPickerLoadHint(
  dates: string[],
  countForDate: (date: string) => number,
  weekly: boolean,
): string {
  const uniqueDates = [...new Set(dates)];
  if (!uniqueDates.length) return "Нет дат проведения";

  const counts = uniqueDates.map(countForDate);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const countLabel =
    minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`;
  const weekdays = new Set(uniqueDates.map(dayKey));
  const period = weekly
    ? weekdays.size === 1
      ? WEEKDAY_LOAD_LABELS[dayKey(uniqueDates[0])]
      : "в дни проведения"
    : "за день";

  return `${countLabel} ${lessonNoun(maximum)} ${period}`;
}

export function formatPickerConflictDates(dates: string[]): string {
  if (!dates.length) return "Нет дат проведения";
  return [...new Set(dates)]
    .sort()
    .map((date) => formatDisplayDate(date))
    .join(", ");
}
