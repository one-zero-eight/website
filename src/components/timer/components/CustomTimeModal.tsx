import { ModalWindow } from "@/components/events/CreationModal/ModalWindow";
import { useMemo, useState } from "react";

interface CustomTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (targetDate: Date) => void;
}

const CustomTimeModal = ({
  open,
  onOpenChange,
  onStart,
}: CustomTimeModalProps) => {
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [error, setError] = useState<string>("");

  const MAX_SECONDS = 99 * 3600 + 99 * 60 + 99;

  const { minDateTime, maxDateTime } = useMemo(() => {
    const minNow = new Date();
    minNow.setSeconds(0, 0);

    const maxNow = new Date(Date.now() + MAX_SECONDS * 1000);

    const formatForInput = (date: Date) => {
      const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return d.toISOString().slice(0, 16);
    };

    return {
      minDateTime: formatForInput(minNow),
      maxDateTime: formatForInput(maxNow),
    };
  }, [open, MAX_SECONDS]);

  const handleStart = () => {
    if (!selectedDateTime) return;
    const targetDate = new Date(selectedDateTime);
    const now = Date.now();
    const totalSeconds = Math.round((targetDate.getTime() - now) / 1000);

    if (totalSeconds <= 0) {
      setError("The selected time must be in the future");
      return;
    }

    if (totalSeconds > MAX_SECONDS) {
      setError("The maximum countdown duration is 99:99:99");
      return;
    }

    onStart(targetDate);
    setSelectedDateTime("");
    setError("");
    onOpenChange(false);
  };

  return (
    <ModalWindow
      open={open}
      title="Select Target Time"
      onOpenChange={onOpenChange}
      className=""
    >
      <div className="flex flex-col gap-4 sm:gap-6">
        <p className="text-base-content/70 text-sm">
          Select a specific date and time in the future. The timer will count
          down until that moment.
        </p>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold">Target Date & Time</span>
          </label>
          <input
            type="datetime-local"
            className={`input input-bordered w-full text-lg ${error ? "input-error" : "input-primary"}`}
            value={selectedDateTime}
            onChange={(e) => {
              setSelectedDateTime(e.target.value);
              setError("");
            }}
            min={minDateTime}
            max={maxDateTime}
          />
          {error && (
            <label className="label">
              <span className="label-text-alt text-error font-medium">
                {error}
              </span>
            </label>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary w-full px-8 sm:w-auto"
            onClick={handleStart}
            disabled={
              !selectedDateTime ||
              new Date(selectedDateTime).getTime() <= Date.now()
            }
          >
            Start Timer
          </button>
        </div>
      </div>
    </ModalWindow>
  );
};

export default CustomTimeModal;
