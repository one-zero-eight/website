export const SEARCH_API_URL = import.meta.env.VITE_SEARCH_API_URL!;

// The events the user added with "Add to my calendar" under the assistant's answers, here and in the Telegram bot
export function getMyAssistantCalendarLink() {
  return `${SEARCH_API_URL}/users/my-calendar.ics`;
}
