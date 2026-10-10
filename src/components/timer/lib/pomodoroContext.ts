import { createContext, useContext } from "react";
import { usePomodoro } from "./usePomodoro";

export type PomodoroContextValue = ReturnType<typeof usePomodoro>;

export const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoroContext must be used inside PomodoroProvider");
  }
  return context;
}
