/**
 * Extracts the date part (YYYY-MM-DD) from an ISO datetime string
 * @param dt - ISO datetime string
 * @returns Date string in YYYY-MM-DD format
 */
export const getDate = (dt: string) => {
  return dt.split("T")[0];
};

/**
 * Extracts time in HH:mm format from an ISO datetime string
 * @param isoString - ISO datetime string
 * @returns Time string in HH:mm format
 */
export const parseTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toTimeString().substring(0, 5);
  } catch {
    return isoString.split("T")[1]?.split(".")[0]?.substring(0, 5) || "";
  }
};

/**
 * Formats a time string (currently returns as-is)
 * @param timeString - Time string to format
 * @returns Formatted time string (or empty string if input is empty)
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return "";
  return timeString;
};

/**
 * Checks if two date strings represent the same day
 * @param dateStringA - First date string
 * @param dateStringB - Second date string
 * @returns True if both dates are on the same day
 */
export const isDatesEqual = (dateStringA: string, dateStringB: string) => {
  const da = new Date(dateStringA);
  const db = new Date(dateStringB);
  return da.getDate() === db.getDate() && da.getMonth() === db.getMonth();
};

/**
 * Formats a date string to "Month, day" format (e.g., "Jan, 15")
 * @param dateString - Date string to format
 * @returns Formatted date string (or empty string if input is empty)
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
  });
};

/**
 * Returns the day name for a day number (1-7, where 1 is Monday)
 * @param dayNumber - Day number (1-7)
 * @returns Day name string or "Unknown"
 */
export const getDayName = (dayNumber: number): string => {
  const days = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  return days[dayNumber as keyof typeof days] || "Unknown";
};

/**
 * Checks if an event's start date has passed
 * @param dtstart - Event start date string
 * @returns True if the event date has passed
 */
export const isWorkshopPast = (dtstart: string): boolean => {
  if (!dtstart) return false;

  const now = new Date();
  const workshopDate = new Date(dtstart);

  return workshopDate < now;
};

/**
 * Returns the abbreviated weekday name for a date string
 * @param date - Date string
 * @returns Abbreviated weekday name (e.g., "Mon", "Tue")
 */
export const getWeekdayName = (date: string) => {
  return new Date(date).toLocaleString("en", { weekday: "short" });
};
