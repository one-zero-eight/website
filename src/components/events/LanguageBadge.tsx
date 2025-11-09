import { SchemaWorkshop } from "@/api/workshops/types";
import clsx from "clsx";
import { eventLangauage } from "./event-utils";

export interface LanguageBadgeProps {
  event: SchemaWorkshop;
  className?: string;
}

export function LanguageBadge({ event, className }: LanguageBadgeProps) {
  return (
    <div
      className={clsx(
        "badge badge-soft rounded-lg font-bold [--badge-color:var(--color-emerald-500)]",
        className,
      )}
    >
      {eventLangauage(event)}
    </div>
  );
}
