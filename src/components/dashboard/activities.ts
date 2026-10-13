export type DashboardActivity = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
};

export function getUpcomingActivities<T extends DashboardActivity>(
  activities: T[],
  nowMs: number,
  limit: number,
): T[] {
  return (
    activities
      .filter(
        ({ start, end }) =>
          Number.isFinite(start.getTime()) &&
          Number.isFinite(end.getTime()) &&
          end.getTime() > start.getTime() &&
          end.getTime() > nowMs,
      )
      // Prioritize timed activities so all-day reminders cannot hide every class
      // or mask the ongoing/next activity's status. Each group stays chronological.
      .sort(
        (left, right) =>
          Number(!!left.allDay) - Number(!!right.allDay) ||
          left.start.getTime() - right.start.getTime(),
      )
      .slice(0, limit)
  );
}

export function getActivityStatus(activity: DashboardActivity, nowMs: number) {
  if (activity.end.getTime() <= nowMs) return "Finished";
  if (activity.start.getTime() <= nowMs) {
    return activity.allDay ? "All day" : "In process";
  }

  const minutes = Math.ceil((activity.start.getTime() - nowMs) / 60_000);
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `Starts in ${hours} h${remainingMinutes ? ` ${remainingMinutes} min` : ""}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `Starts in ${days} d${remainingHours ? ` ${remainingHours} h` : ""}`;
}

export function formatActivityTime(activity: DashboardActivity) {
  if (activity.allDay) return "All day";
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const startTime = activity.start.toLocaleTimeString("en-GB", options);
  const endTime = activity.end.toLocaleTimeString("en-GB", options);
  return `${startTime}–${endTime}`;
}

export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatScheduleDayHeader(date: Date, nowMs: number): string {
  const today = new Date(nowMs);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayOrdinal = getOrdinalSuffix(date.getDate());
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const formattedDate = `${weekday}, ${dayOrdinal} of ${month}`;

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${formattedDate}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${formattedDate}`;
  }
  return formattedDate;
}
