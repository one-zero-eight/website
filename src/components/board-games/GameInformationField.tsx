import { cn } from "@/lib/ui/cn";
import type React from "react";

export function GameInformationField({
  label,
  className,
  children,
}: React.PropsWithChildren<{ label: string; className?: string }>) {
  if (children === null || children === undefined || children === "") {
    return null;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-base-content/60 text-xs font-semibold uppercase">
        {label}
      </p>
      <div className="wrap-break-word">{children}</div>
    </div>
  );
}
