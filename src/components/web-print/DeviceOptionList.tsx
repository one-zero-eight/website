import { type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function DeviceOption({
  title,
  selected,
  disabled,
  onClick,
  meta,
}: {
  title: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  meta: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-field border-base-content/20 flex w-full flex-col items-start gap-0.5 border-2 px-3 py-2.5 text-left transition-colors",
        selected && "border-primary bg-primary/5",
        !selected && !disabled && "hover:border-base-content/40",
        disabled && "opacity-50",
      )}
    >
      <span className="text-sm">{title}</span>
      <span className="text-xs">{meta}</span>
    </button>
  );
}

export function DeviceOptionList({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-base-content/70 text-sm">{label}</span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
