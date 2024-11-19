import { useState } from "react";
import { useInterval } from "usehooks-ts";

export function useNowMS(enabled: boolean) {
  const [now, setNow] = useState<number>(Date.now());
  // Update every 5 seconds
  useInterval(() => setNow(Date.now()), enabled ? 5000 : null);
  return now;
}
