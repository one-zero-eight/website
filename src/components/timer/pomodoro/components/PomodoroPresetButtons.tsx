import { cn } from "@/lib/ui/cn";
import { PomodoroSettings } from "../lib/usePomodoro";

export type PomodoroPreset = Pick<
  PomodoroSettings,
  "workMinutes" | "shortBreakMinutes" | "longBreakMinutes"
>;

const POMODORO_PRESETS: PomodoroPreset[] = [
  { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 60 },
  { workMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 120 },
  { workMinutes: 90, shortBreakMinutes: 30, longBreakMinutes: 120 },
];

export function PomodoroPresetButtons({
  settings,
  onSelectPreset,
}: {
  settings: PomodoroSettings;
  onSelectPreset: (preset: PomodoroPreset) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {POMODORO_PRESETS.map((preset) => {
        const isSelected =
          preset.workMinutes === settings.workMinutes &&
          preset.shortBreakMinutes === settings.shortBreakMinutes &&
          preset.longBreakMinutes === settings.longBreakMinutes;

        return (
          <button
            type="button"
            key={`${preset.workMinutes}-${preset.shortBreakMinutes}-${preset.longBreakMinutes}`}
            className={cn("btn", isSelected && "btn-primary")}
            onClick={() => onSelectPreset(preset)}
          >
            {preset.workMinutes} + {preset.shortBreakMinutes}
          </button>
        );
      })}
    </div>
  );
}
