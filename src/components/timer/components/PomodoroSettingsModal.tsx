import { Modal } from "@/components/common/Modal.tsx";
import { useEffect, useState } from "react";
import { PomodoroSettings } from "../lib/usePomodoro";

const SETTINGS_FIELDS: {
  key: keyof PomodoroSettings;
  label: string;
  unit: string;
}[] = [
  { key: "workMinutes", label: "Focus", unit: "min" },
  { key: "shortBreakMinutes", label: "Short break", unit: "min" },
  { key: "longBreakMinutes", label: "Long break", unit: "min" },
  {
    key: "sessionsBeforeLongBreak",
    label: "Cycles before long break",
    unit: "sessions",
  },
];

export function PomodoroSettingsModal({
  open,
  onOpenChange,
  settings,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const isValid = SETTINGS_FIELDS.every(({ key }) => draft[key] >= 1);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Pomodoro settings">
      <div className="flex flex-col gap-3">
        {SETTINGS_FIELDS.map(({ key, label, unit }) => (
          <label key={key} className="flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="input input-bordered w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: Math.floor(+e.target.value) })
                }
              />
              <span className="text-base-content/60 w-16 text-sm">{unit}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!isValid}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
