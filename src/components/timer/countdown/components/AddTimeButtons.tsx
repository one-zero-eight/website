import { ADD_TIME_OPTIONS } from "../lib/constants";

interface AddTimeButtonsProps {
  isRunning: boolean;
  onAddTime: (minutes: number) => void;
}

export const AddTimeButtons = ({
  isRunning,
  onAddTime,
}: AddTimeButtonsProps) => {
  if (!isRunning) return null;

  return (
    <div className="mb-6 flex flex-col items-center gap-2 px-4 sm:gap-3 md:mb-8">
      <span className="text-base-content mr-1 w-full self-center text-center text-sm font-semibold sm:mr-2 sm:w-auto sm:text-base md:text-lg">
        More time:
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {ADD_TIME_OPTIONS.map((minutes) => (
          <button
            type="button"
            key={minutes}
            onClick={() => onAddTime(minutes)}
            className="btn sm:btn-md btn-sm"
          >
            +{minutes} min
          </button>
        ))}
      </div>
    </div>
  );
};
