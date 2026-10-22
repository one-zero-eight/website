import { T } from "@/lib/utils/dates";
import { t } from "@lingui/core/macro";

export function formatBookingDuration(durationMs: number): string {
  const hours = Math.floor(durationMs / T.Hour);
  const minutes = Math.floor((durationMs % T.Hour) / T.Min);
  return [hours > 0 ? t`${hours}h` : "", minutes > 0 ? t`${minutes}m` : ""]
    .filter(Boolean)
    .join(" ");
}

export const getTimeRangeForWeek = (
  daysBefore: number = 7,
  daysAfter: number = 7,
) => {
  const today = new Date(Date.now());
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today.getTime() - daysBefore * T.Day);
  const endDate = new Date(today.getTime() + daysAfter * T.Day);

  return { startDate, endDate };
};

export function sanitizeBookingTitle(title: string | undefined): string {
  if (!title) return "";
  const sanitized = title
    .replace("Students Booking Service", "")
    .replace("FW:", "")
    .trim();
  if (sanitized) {
    return sanitized;
  } else {
    return title.trim(); // Do not remove "Students Booking Service" if it's the only content
  }
}
