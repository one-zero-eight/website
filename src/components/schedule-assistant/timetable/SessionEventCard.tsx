import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

export function SessionEventCard({
  children,
  deleted = false,
  highlighted = false,
  selected = false,
  className,
}: {
  children: ReactNode;
  deleted?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        deleted && "border-error/60 border-l-4 pl-2",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-box border-base-300 box-border border-2 p-2",
          selected && "bg-primary/5",
          highlighted && !selected && "border-primary/40",
          deleted && "opacity-70",
        )}
      >
        {children}
      </div>
    </div>
  );
}
