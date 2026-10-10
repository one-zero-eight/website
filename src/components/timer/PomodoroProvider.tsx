import { PomodoroContext } from "./lib/pomodoroContext";
import { useLastUsedTimer } from "./lib/useLastUsedTimer";
import { usePomodoro } from "./lib/usePomodoro";
import { usePomodoroAlerts } from "./lib/usePomodoroAlerts";

// Lives in the app layout, so the timer keeps running (and rings) on any page, not only on the Pomodoro page
export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const alerts = usePomodoroAlerts();
  const { setLastUsedTimer } = useLastUsedTimer();
  const pomodoro = usePomodoro({
    onTimeUp: (nextMode) => {
      alerts.notifyTimeUp(nextMode);
      setLastUsedTimer("pomodoro");
    },
  });

  const start = () => {
    alerts.requestNotificationPermission();
    pomodoro.start();
  };

  return (
    <PomodoroContext value={{ ...pomodoro, start }}>{children}</PomodoroContext>
  );
}
