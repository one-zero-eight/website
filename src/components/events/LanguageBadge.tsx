import clsx from "clsx";
import { eventLanguage } from "./utils";
import { LanguageBadgeProps } from "./types";

export function LanguageBadge({ event, className }: LanguageBadgeProps) {
  return (
    <span
      className={clsx(
        "badge badge-soft rounded-lg font-bold [--badge-color:var(--color-violet-500)]",
        className,
      )}
    >
      {eventLanguage(event)}
    </span>
  );
}
