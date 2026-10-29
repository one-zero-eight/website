import { msg } from "@lingui/core/macro";
import { type MessageDescriptor } from "@lingui/core";
import { Modal } from "@/components/common/Modal.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useState } from "react";
import { MAX_SECONDS } from "@/components/timer/lib/constants";

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
  const { t, i18n } = useLingui();
  const [error, setError] = useState<MessageDescriptor | null>(null);
  const [previewTime, setPreviewTime] = useState<string | null>(null);

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
  }, []);

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
  }, [selectedDateTime]);

  const handleStart = () => {
    if (!selectedDateTime) return;
    const targetDate = new Date(selectedDateTime);
    const now = Date.now();
    const totalSeconds = Math.round((targetDate.getTime() - now) / 1000);

    if (totalSeconds <= 0) {
      setError(msg`The selected time must be in the future`);
      return;
    }

    if (totalSeconds > MAX_SECONDS) {
      setError(msg`The maximum countdown duration is 99:59:59`);
      return;
    }

    onStart(targetDate);
    setSelectedDateTime("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      title={t`Select Target Time`}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col gap-2">
        <p className="text-base-content/70 text-sm">
          <Trans>
            Select a specific date and time in the future. The timer will count
            down until that moment.
          </Trans>
        </p>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text py-2 font-bold">
              <Trans>Target Date & Time</Trans>
            </span>
          </label>
          <input
            type="datetime-local"
            className={`input input-bordered w-full text-lg ${error ? "input-error" : "input-primary"}`}
            value={selectedDateTime}
            onChange={(e) => {
              setSelectedDateTime(e.target.value);
              setError(null);
            }}
            min={minDateTime}
            max={maxDateTime}
          />
          {error ? (
            <label className="label">
              <span className="label-text-alt text-error py-2 font-medium text-wrap">
                {i18n._(error)}
              </span>
            </label>
          ) : (
            previewTime && (
              <div className="mt-2 flex flex-col items-start gap-1 rounded-lg py-1.5 transition-all">
                <span className="text-base-content/50 text-xs font-medium">
                  <Trans>Time you will have</Trans>
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
            <Trans>Cancel</Trans>
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
            <Trans>Start Timer</Trans>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomTimeModal;
