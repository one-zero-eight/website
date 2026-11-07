import { useLocalStorage } from "usehooks-ts";

// AI Calendar: the events the user added with "Add to my calendar" under the assistant's answers (here and in the Telegram
// bot), taken from the search API. It is shown by default; hiding it is remembered in this browser, as the schedule API keeps
// no setting for it
export function useAiCalendarHidden() {
  return useLocalStorage("calendar-ai-hidden", false);
}
