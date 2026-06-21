export type Event = {
  id: string;
  name: string;
  password: string | null;
  timezone: string;
  createdAt: Date;
  expiresAt: Date;
  baseAvailability: Availability;
  participantsAvailability: ParticipantAvailability[];
};

export type ParticipantAvailability = {
  userName: string;
  availability: Availability;
};

export type CalendarItem = {
  date: Date;
  hidden: boolean;
  selected: boolean;
};

export type TimeRangeSelection = {
  start: string;
  end: string;
}; // e.g. ['09:00', '12:30']

export type DayAvailability = Record<number, TimeRangeSelection[]>;
export type MonthAvailability = Record<number, DayAvailability>;
export type Availability = Record<number, MonthAvailability>;

/**
 * Converts strings of ISO dates (YYYY-MM-DD) to JS object, grouping days
 * @param date Set of strings of ISO dates (YYYY-MM-DD)
 * @param time (optional) TimeRangeSelection object
 * @returns GroupedDates object which contains days grouped by months and years
 */
export function groupDatesByYearMonth(
  dates: Set<string>,
  time: TimeRangeSelection | null = null,
): Availability {
  const result: Availability = {};

  dates.forEach((dateStr) => {
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!result[year]) result[year] = {};
    if (!result[year][month]) result[year][month] = {};
    if (!result[year][month][day]) result[year][month][day] = [];

    // Push the provided time range (or an empty default)
    if (time) {
      result[year][month][day].push({ start: time.start, end: time.end });
    }
  });

  // Optional: sort day keys numerically for each month
  for (const year in result) {
    for (const month in result[year]) {
      const sortedDays = Object.keys(result[year][month])
        .map(Number)
        .sort((a, b) => a - b);

      const sortedObj: Record<number, TimeRangeSelection[]> = {};
      sortedDays.forEach((d) => {
        sortedObj[d] = result[year][month][d];
      });
      result[year][month] = sortedObj;
    }
  }

  return result;
}

/**
 * Returns latest date from set of strings of ISO dates (YYYY-MM-DD)
 * @param dates Set of strings of ISO dates (YYYY-MM-DD)
 * @returns Date object with the latest date or tommorow
 */
export function getLatestDate(dates: Set<string>): Date {
  if (dates.size === 0) {
    // Return one hour from now if no dates are provided
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  const latestStr = [...dates].sort().at(-1);
  return latestStr
    ? new Date(latestStr)
    : new Date(Date.now() + 60 * 60 * 1000);
}

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

  const cellsNeeded = startWeekday + daysInMonth;
  const targetLength = Math.ceil(cellsNeeded / 7) * 7;

  while (calendar.length < targetLength) {
    const nextDay: number = calendar.length - (startWeekday + daysInMonth) + 1;
    const date = new Date(year, month + 1, nextDay);
    calendar.push({
      date,
      hidden: true,
      selected: selected?.has(date.toLocaleDateString("en-CA")) || false,
    });
  }

  return calendar;
}

/**
 * Checks wether groupedDates has empty days or  not
 * @param groupedDates
 * @returns true if there are empty days, otherwise returns false
 */
export function hasEmptyDays(groupedDates: Availability | undefined | null) {
  if (!groupedDates) return false;

  for (const year in groupedDates) {
    const months = groupedDates[+year];
    for (const month in months) {
      const days = months[+month];
      for (const day in days) {
        const selections = days[+day];
        if (!selections || selections.length === 0) {
          return true;
        }
      }
    }
  }
  return false;
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
