export type CalendarItem = {
  date: Date;
  hidden: boolean;
  selected: boolean;
};

export type TimeRangeSelection = {
  start: string;
  end: string;
}; // e.g. ['09:00', '12:30']

/**
 * Generates month for calendar based on year and month
 * @param year
 * @param month
 * @param selected (optional) Set of strings in ISO (YYYY-MM-DD) format. Sets selected for month
 * @returns Calendar object which contain days with {date, hidden (current month or not), selected: false (based on selected param)}
 */
export function generateCalendarMonth(
  year: number,
  month: number,
  selected?: Set<string>,
) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendar: CalendarItem[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    calendar.push({
      date,
      hidden: true,
      selected: selected?.has(date.toLocaleDateString("en-CA")) || false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    calendar.push({
      date,
      hidden: false,
      selected: selected?.has(date.toLocaleDateString("en-CA")) || false,
    });
  }

  let nextDay = 1;

  while (calendar.length < 42) {
    const date = new Date(year, month + 1, nextDay);
    calendar.push({
      date,
      hidden: true,
      selected: selected?.has(date.toLocaleDateString("en-CA")) || false,
    });
    nextDay += 1;
  }

  return calendar;
}

/**
 * Converts given hours and minutes to a string time formated as HH:MM with trailing zeroes
 * @param hour hours
 * @param minutes (optional) minutes
 * @returns string time of format HH:MM
 */
export function formatHour(hour: number, minutes?: number): string {
  const h = hour % 24;
  const m = (minutes || 0) % 60;

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Parses hours from string to number
 * @param value time in string
 * @returns hour as a number
 */
export function parseHour(value: string): number {
  const num = parseInt(value.split(":")[0], 10);
  return isNaN(num) ? 0 : num;
}
