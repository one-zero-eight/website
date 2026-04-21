/** Sport office schedules follow Europe/Moscow (MSK, fixed UTC+3). */
const MSK_TZ = "Europe/Moscow";
const MSK_OFFSET = "+03:00";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function moscowYmd(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MSK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return { y, m, day };
}

const MSK_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** 0 = Monday … 6 = Sunday (calendar week starting Monday). */
function moscowWeekdayMon0(d: Date): number {
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone: MSK_TZ,
    weekday: "long",
  }).format(d);
  const idx = MSK_WEEKDAYS.indexOf(w as (typeof MSK_WEEKDAYS)[number]);
  return idx === -1 ? 0 : idx;
}

/** Civil midnight at start of Y-M-D in Moscow, as a UTC `Date`. */
function moscowStartOfDay(y: number, m: number, day: number): Date {
  return new Date(`${y}-${pad2(m)}-${pad2(day)}T00:00:00${MSK_OFFSET}`);
}

/** Monday 00:00 MSK for the week that contains `anchor`. */
export function startOfSportWeekMoscow(anchor: Date): Date {
  let d = new Date(anchor);
  for (let i = 0; i < 8; i++) {
    if (moscowWeekdayMon0(d) === 0) {
      const { y, m, day } = moscowYmd(d);
      return moscowStartOfDay(y, m, day);
    }
    d = new Date(d.getTime() - 24 * 3600 * 1000);
  }
  const { y, m, day } = moscowYmd(anchor);
  return moscowStartOfDay(y, m, day);
}

/** Sunday 23:59:59 MSK (same week as `weekStartMonday`). */
export function endOfSportWeekMoscow(weekStartMonday: Date): Date {
  const sunMidnightUtc = new Date(
    weekStartMonday.getTime() + 6 * 24 * 3600 * 1000,
  );
  const { y, m, day } = moscowYmd(sunMidnightUtc);
  return new Date(`${y}-${pad2(m)}-${pad2(day)}T23:59:59${MSK_OFFSET}`);
}

/**
 * InnoSport API: avoid fractional seconds (some stacks mishandle `.999Z`).
 * Send UTC ISO with second precision.
 */
export function toScheduleApiDateTime(d: Date): string {
  const iso = d.toISOString();
  return /\.\d+Z$/.test(iso) ? iso.replace(/\.\d+Z$/, "Z") : iso;
}

export function formatSportWeekRangeLabel(
  weekStart: Date,
  weekEnd: Date,
): string {
  const optsShort: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: MSK_TZ,
  };
  const fmtShort = new Intl.DateTimeFormat("en-US", optsShort);
  const fmtLong = new Intl.DateTimeFormat("en-US", {
    ...optsShort,
    year: "numeric",
  });
  const yearFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MSK_TZ,
    year: "numeric",
  });
  const sameYear = yearFmt.format(weekStart) === yearFmt.format(weekEnd);
  const a = sameYear ? fmtShort.format(weekStart) : fmtLong.format(weekStart);
  const b = fmtLong.format(weekEnd);
  return `${a} – ${b}`;
}

/** Group schedule rows by calendar date in Moscow (YYYY-MM-DD). */
export function moscowDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: MSK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDayHeaderMoscow(iso: string): {
  weekday: string;
  long: string;
} {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: MSK_TZ,
    }),
    long: d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: MSK_TZ,
    }),
  };
}

export function formatTimeRangeMoscow(
  startIso: string,
  endIso: string,
): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const t = (x: Date) =>
    x.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: MSK_TZ,
    });
  return `${t(s)} – ${t(e)}`;
}
