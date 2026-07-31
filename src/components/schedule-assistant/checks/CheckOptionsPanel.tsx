import type { SchemaCheckParameters } from "@/api/schedule-assistant/types.ts";
import {
  ALL_CHECK_PARAMETERS,
  areAllChecksEnabled,
  CHECK_OPTIONS,
  DEFAULT_CHECK_PARAMETERS,
  NO_CHECK_PARAMETERS,
} from "@/components/schedule-assistant/checks/checksModel.ts";
import { cn } from "@/lib/ui/cn";

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
        {CHECK_OPTIONS.map((option) => {
          const countTouchingKey = option.countTouchingKey;
          const parentEnabled = value[option.key];

          return (
            <div
              key={option.key}
              className="border-base-300 hover:bg-base-200/60 flex flex-col gap-2 rounded-lg border p-3 transition-colors"
            >
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={parentEnabled}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      [option.key]: event.target.checked,
                      ...(countTouchingKey && !event.target.checked
                        ? { [countTouchingKey]: false }
                        : {}),
                    })
                  }
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {option.label}
                    {option.slow ? (
                      <span
                        className="icon-[mdi--tortoise] text-base-content/50 shrink-0 text-base"
                        title="Медленная проверка"
                      />
                    ) : null}
                  </span>
                  <span className="text-base-content/70 block text-xs leading-snug">
                    {option.description}
                  </span>
                </span>
              </label>

              {countTouchingKey ? (
                <label
                  className={cn(
                    "border-base-300 ml-7 flex cursor-pointer gap-2 rounded-md border border-dashed px-2 py-1.5",
                    (!parentEnabled || disabled) &&
                      "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs mt-0.5"
                    checked={value[countTouchingKey]}
                    disabled={disabled || !parentEnabled}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [countTouchingKey]: event.target.checked,
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">
                      Считать стык слотов конфликтом
                    </span>
                    <span className="text-base-content/70 block text-[11px] leading-snug">
                      Если выключено, занятия вида 12:50–14:20 и 14:20–15:50 не
                      считаются пересечением
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
