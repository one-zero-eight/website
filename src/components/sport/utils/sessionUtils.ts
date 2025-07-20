/**
 * Utility functions for managing training sessions and IDs
 */

/**
 * Generates a consistent session ID for both ClubPage and SchedulePage
 * @param activity - The activity name
 * @param day - The day of the week
 * @param time - The time slot
 * @param date - The date of the session
 * @returns A unique session ID
 */
export const generateSessionId = (
  activity: string,
  day: string,
  time: string,
  date: Date
): string => {
  // Create a consistent format that can be used by both pages
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${activity.toLowerCase().replace(/\s+/g, '-')}-${day.toLowerCase()}-${time.replace(/[:\s-]/g, '')}-${dateStr}`;
};


/**
 * Formats a session date for display
 * @param date - The session date
 * @returns Formatted date string
 */
export const formatSessionDate = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};
