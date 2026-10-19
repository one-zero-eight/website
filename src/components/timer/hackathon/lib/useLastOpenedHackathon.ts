import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function useLastOpenedHackathon(openedTimerId?: string) {
  const [lastOpenedTimerId, setLastOpenedTimerId] = useLocalStorage<
    string | null
  >("last-opened-hackathon-timer", null);

  useEffect(() => {
    if (openedTimerId) setLastOpenedTimerId(openedTimerId);
  }, [openedTimerId, setLastOpenedTimerId]);

  return lastOpenedTimerId;
}
