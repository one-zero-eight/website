import { cn } from "@/lib/ui/cn";
import {
  SettingsIdentityFields,
  type SettingsInputFieldProps,
} from "@/components/schedule-assistant/settings/SettingsIdentityFields.tsx";
import type { ComponentProps } from "react";

type TextareaFieldProps = Pick<
  ComponentProps<"textarea">,
  "value" | "onChange" | "onFocus" | "onBlur"
>;

const inputClassName =
  "input input-bordered input-sm w-full px-3 py-2 text-sm font-normal leading-normal [color-scheme:inherit]";

export function StudentGroupFields({
  nameField,
  codeField,
  estimatedSizeField,
  studentsField,
  required = false,
  fillAvailableHeight = false,
}: {
  nameField: SettingsInputFieldProps;
  codeField: SettingsInputFieldProps;
  estimatedSizeField: SettingsInputFieldProps;
  studentsField: TextareaFieldProps;
  required?: boolean;
  fillAvailableHeight?: boolean;
}) {
  const studentsCount = String(studentsField.value ?? "")
    .split("\n")
    .map((student) => student.trim())
    .filter(Boolean).length;
  const fieldClassName = cn(
    "flex w-full flex-col gap-1.5",
    fillAvailableHeight && "form-control shrink-0 px-1 py-0.5",
  );
  const labelClassName =
    "text-base-content/70 text-xs font-medium tracking-wide uppercase";

  return (
    <>
      <SettingsIdentityFields
        nameField={nameField}
        codeField={codeField}
        required={required}
        detailLayout={fillAvailableHeight}
        namePlaceholder={required ? "B-BS3-TECH-01" : undefined}
        codePlaceholder={required ? "B-BS3-TECH-01" : undefined}
      />
      <label className={fieldClassName}>
        <span className={labelClassName}>Оценка размера</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={inputClassName}
          placeholder={required ? "25" : undefined}
          {...estimatedSizeField}
        />
      </label>
      <label
        className={cn(fieldClassName, fillAvailableHeight && "min-h-0 flex-1")}
      >
        <span className={labelClassName}>
          Студенты (по одному email в строке)
          <span className="text-base-content/55 ml-1.5 font-medium normal-case tabular-nums">
            · {studentsCount}
          </span>
        </span>
        <textarea
          className={cn(
            "textarea textarea-bordered w-full px-3 py-2 text-sm leading-normal font-normal [color-scheme:inherit]",
            fillAvailableHeight
              ? "min-h-20 flex-1 resize-none"
              : "min-h-28 resize-y",
          )}
          placeholder={
            "student@innopolis.university\nanother@innopolis.university"
          }
          {...studentsField}
        />
      </label>
    </>
  );
}
