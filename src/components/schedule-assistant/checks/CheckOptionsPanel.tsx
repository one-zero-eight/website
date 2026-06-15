import type { SchemaCheckParameters } from "@/api/schedule-assistant/types.ts";
import {
  ALL_CHECK_PARAMETERS,
  areAllChecksEnabled,
  CHECK_OPTIONS,
  DEFAULT_CHECK_PARAMETERS,
  NO_CHECK_PARAMETERS,
} from "@/components/schedule-assistant/checks/checksModel.ts";

export function CheckOptionsPanel({
  value,
  onChange,
  disabled,
}: {
  value: SchemaCheckParameters;
  onChange: (value: SchemaCheckParameters) => void;
  disabled?: boolean;
}) {
  const allEnabled = areAllChecksEnabled(value);

  return (
    <div className="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Параметры проверки</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={disabled}
            onClick={() =>
              onChange(allEnabled ? NO_CHECK_PARAMETERS : ALL_CHECK_PARAMETERS)
            }
          >
            {allEnabled ? "Выключить все" : "Включить все"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={disabled}
            onClick={() => onChange(DEFAULT_CHECK_PARAMETERS)}
          >
            По умолчанию
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {CHECK_OPTIONS.map((option) => (
          <label
            key={option.key}
            className="border-base-300 hover:bg-base-200/60 flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={value[option.key]}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  [option.key]: event.target.checked,
                })
              }
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="text-base-content/70 block text-xs leading-snug">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
