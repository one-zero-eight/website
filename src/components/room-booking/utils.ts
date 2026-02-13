import { T } from "@/lib/utils/dates";

export const getTimeRangeForWeek = () => {
  const today = new Date(Date.now());
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today.getTime() - 7 * T.Day);
  const endDate = new Date(today.getTime() + 7 * T.Day);

  return { startDate, endDate };
};
