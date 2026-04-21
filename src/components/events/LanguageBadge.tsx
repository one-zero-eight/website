import { cn } from "@/lib/ui/cn";
import { eventLanguage } from "./utils";
import { LanguageBadgeProps } from "./types";

export function LanguageBadge({ event, className }: LanguageBadgeProps) {
  return (
    <span
      className={cn(
        "badge badge-soft rounded-field font-bold [--badge-color:var(--color-violet-500)]",
        className,
      )}
    >
      {eventLanguage(event)}
    </span>
  );
}
