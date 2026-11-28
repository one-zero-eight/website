export const SEARCH_API_URL = import.meta.env.VITE_SEARCH_API_URL!;

export function getAiCalendarExportLink(
  accessKey: string,
  baseUrl = SEARCH_API_URL,
) {
  return `${baseUrl.replace(/\/+$/, "")}/users/calendar-export.ics?access_key=${encodeURIComponent(accessKey)}`;
}

// The events the user added with "Add to my calendar" under the assistant's answers, here and in the Telegram bot
export function getMyAssistantCalendarLink() {
  return `${SEARCH_API_URL}/users/my-calendar.ics`;
}
