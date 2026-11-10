import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function useLastOpenedHackathon(openedTimerId?: number) {
  const [lastOpenedTimerId, setLastOpenedTimerId] = useLocalStorage<
    number | null
  >("last-opened-hackathon-timer", null);

  useEffect(() => {
    if (openedTimerId) setLastOpenedTimerId(openedTimerId);
  }, [openedTimerId, setLastOpenedTimerId]);

  return lastOpenedTimerId;
}
