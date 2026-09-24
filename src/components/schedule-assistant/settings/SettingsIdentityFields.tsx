import { cn } from "@/lib/ui/cn";
import type { ComponentProps } from "react";

export type SettingsInputFieldProps = Pick<
  ComponentProps<"input">,
  "value" | "onChange" | "onFocus" | "onBlur"
>;

const inputClassName =
  "input input-bordered input-sm w-full px-3 py-2 text-sm font-normal leading-normal [color-scheme:inherit]";

export function SettingsIdentityFields({
  nameField,
  codeField,
  required = false,
  detailLayout = false,
  namePlaceholder,
  codePlaceholder,
}: {
  nameField: SettingsInputFieldProps;
  codeField: SettingsInputFieldProps;
  required?: boolean;
  detailLayout?: boolean;
  namePlaceholder?: string;
  codePlaceholder?: string;
}) {
  const fieldClassName = cn(
    "flex w-full flex-col gap-1.5",
    detailLayout && "form-control shrink-0 px-1 py-0.5",
  );
  const labelClassName =
    "text-base-content/70 text-xs font-medium tracking-wide uppercase";

  return (
    <>
      <label className={fieldClassName}>
        <span className={labelClassName}>
          Название{required ? <span className="text-error"> *</span> : null}
        </span>
        <input
          className={inputClassName}
          required={required}
          placeholder={namePlaceholder}
          {...nameField}
        />
      </label>
      <label className={fieldClassName}>
        <span className={labelClassName}>
          Код{required ? <span className="text-error"> *</span> : null}
        </span>
        <input
          className={inputClassName}
          required={required}
          placeholder={codePlaceholder}
          {...codeField}
        />
      </label>
    </>
  );
}
