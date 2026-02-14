import { T } from "@/lib/utils/dates";

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
