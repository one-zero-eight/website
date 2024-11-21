import { useState } from "react";
import { useInterval } from "usehooks-ts";

export function useNowMS(enabled: boolean, interval: number = 5000) {
  const [now, setNow] = useState<number>(Date.now());
  // Update every 5 seconds
  useInterval(() => setNow(Date.now()), enabled ? interval : null);
  return now;
}
