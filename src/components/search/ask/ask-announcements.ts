import { $search } from "@/api/search";
import { useLocalStorage } from "usehooks-ts";

export const ANNOUNCEMENTS_SEEN_KEY = "catix-announcements-seen";

// The schedule changes found in the user's study chats, the newest last; they come in while the page is open
export function useAnnouncements() {
  return $search.useQuery("get", "/announcements", undefined, {
    refetchInterval: 60_000,
  });
}

// The id of the newest announcement the user has seen. localStorage sync between hooks keeps the badge and the view consistent
export function useAnnouncementsSeen() {
  return useLocalStorage<number>(ANNOUNCEMENTS_SEEN_KEY, 0);
}

export function unreadCount(
  items: { id: number }[] | undefined,
  seenId: number,
): number {
  return items?.filter((item) => item.id > seenId).length ?? 0;
}
