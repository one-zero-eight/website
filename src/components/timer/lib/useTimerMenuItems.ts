import { items, ItemType } from "@/components/layout/menu-links.tsx";
import { useHackathonTimers } from "../hackathon/lib/useHackathonTimers";
import { useLastOpenedHackathon } from "../hackathon/lib/useLastOpenedHackathon";
import { TIMER_PATHS, useLastUsedTimer } from "./useLastUsedTimer";

// Menu items where the "Timer" item opens the timer the user used last
export function useTimerMenuItems(): ItemType[] {
  const { lastUsedTimer } = useLastUsedTimer();
  const { timers } = useHackathonTimers();
  const lastOpenedTimerId = useLastOpenedHackathon();
  const lastHackathonId = timers.find(
    (timer) => timer.id === lastOpenedTimerId,
  )?.id;

  return items.map((item) => {
    if (item.type !== "local" || item.to !== TIMER_PATHS.countdown) return item;
    if (lastUsedTimer === "hackathon" && lastHackathonId) {
      // ItemType cannot express route params (they resolve to `never`)
      return {
        ...item,
        to: "/timer/hackathon/$id",
        params: { id: lastHackathonId },
      } as unknown as ItemType;
    }
    return { ...item, to: TIMER_PATHS[lastUsedTimer] };
  });
}
