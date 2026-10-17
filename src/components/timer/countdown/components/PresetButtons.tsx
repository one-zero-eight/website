import { PRESET_TIME_OPTIONS } from "../lib/constants";

interface PresetButtonsProps {
  isRunning: boolean;
  onSelectPreset: (hours: number, minutes: number) => void;
}

export const PresetButtons = ({
  isRunning,
  onSelectPreset,
}: PresetButtonsProps) => {
  if (isRunning) return null;

  return (
    <div className="mb-6 flex flex-col items-center gap-2 px-4 sm:gap-3 md:mb-8 md:gap-4 md:px-8">
      <span className="text-base-content mr-1 w-full self-center text-center text-sm font-semibold sm:mr-2 sm:w-auto sm:text-base md:text-lg">
        Quick Presets:
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {PRESET_TIME_OPTIONS.map((preset) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => onSelectPreset(preset.hours, preset.minutes)}
            className="btn sm:btn-lg btn-md"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
