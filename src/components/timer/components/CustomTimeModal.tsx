import { ModalWindow } from "@/components/events/CreationModal/ModalWindow";
import { useEffect, useMemo, useState } from "react";

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
  const [previewTime, setPreviewTime] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedDateTime) {
      setPreviewTime(null);
      return;
    }

    const updatePreview = () => {
      const now = Date.now();
      const target = new Date(selectedDateTime).getTime();
      const diff = Math.round((target - now) / 1000);

      if (diff <= 0) {
        setPreviewTime("00:00:00");
        return;
      }

      if (diff > MAX_SECONDS) {
        setPreviewTime(null);
        return;
      }

      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      setPreviewTime(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    };

    updatePreview();
    const interval = setInterval(updatePreview, 1000);
    return () => clearInterval(interval);
  }, [selectedDateTime, MAX_SECONDS]);

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
      closeOutsidePress={true}
    >
      <div className="flex flex-col gap-2">
        <p className="text-base-content/70 text-sm">
          Select a specific date and time in the future. The timer will count
          down until that moment.
        </p>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text py-2 font-bold">
              Target Date & Time
            </span>
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
          {error ? (
            <label className="label">
              <span className="label-text-alt text-error py-2 font-medium text-wrap">
                {error}
              </span>
            </label>
          ) : (
            previewTime && (
              <div className="mt-2 flex flex-col items-start gap-1 rounded-lg py-1.5 transition-all">
                <span className="text-base-content/50 text-xs font-medium">
                  Time you will have
                </span>
                <span className="text-primary font-mono text-3xl font-bold tracking-tight">
                  {previewTime}
                </span>
              </div>
            )
          )}
        </div>

        <div className="mt-0 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
