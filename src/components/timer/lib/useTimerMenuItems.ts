import { items, ItemType } from "@/components/layout/menu-links.tsx";
import { TIMER_PATHS, useLastUsedTimer } from "./useLastUsedTimer";

// Menu items where the "Timer" item opens the timer the user used last
export function useTimerMenuItems(): ItemType[] {
  const { lastUsedTimer } = useLastUsedTimer();

  return items.map((item) => {
    if (item.type !== "local" || item.to !== TIMER_PATHS.countdown) return item;
    return { ...item, to: TIMER_PATHS[lastUsedTimer] };
  });
}
