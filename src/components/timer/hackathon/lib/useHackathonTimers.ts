import { useLocalStorage } from "usehooks-ts";
import { createSeedTimers, HackathonTimer } from "../utils";

const SEED_TIMERS = createSeedTimers();

export function useHackathonTimers() {
  const [timers, setTimers] = useLocalStorage<HackathonTimer[]>(
    "hackathon-timers",
    SEED_TIMERS,
  );

  function addTimer(timer: HackathonTimer) {
    setTimers((previous) => [timer, ...previous]);
  }

  function updateTimer(timer: HackathonTimer) {
    setTimers((previous) =>
      previous.map((item) => (item.id === timer.id ? timer : item)),
    );
  }

  function removeTimer(id: string) {
    setTimers((previous) => previous.filter((item) => item.id !== id));
  }

  return { timers, addTimer, updateTimer, removeTimer };
}
