import { eventFieldClass } from "./formStyles";

export function durationApiToForm(
  durationHours: number | null | undefined,
): string {
  if (durationHours === null || durationHours === undefined) {
    return "";
  }

  return String(durationHours);
}

export function durationFormToApi(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function DurationField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>Duration (hours)</span>
      <input
        type="number"
        min={0.25}
        step={0.25}
        className={eventFieldClass()}
        placeholder="e.g. 2"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
