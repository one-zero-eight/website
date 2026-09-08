import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export const meetingMetadataGridClass =
  "grid min-w-0 grid-cols-[fit-content(55%)_minmax(0,1fr)] gap-x-2.5";
export const meetingMetadataSubgridClass =
  "col-span-2 grid min-w-0 grid-cols-subgrid";
export const meetingMetadataCardClass = "px-2 py-1";
export const meetingMetadataTextClass = "text-sm leading-5";
export const meetingMetadataOverrideClass =
  "underline decoration-sky-400 decoration-wavy decoration-1 underline-offset-2";

export function MeetingMetadataRow({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <span
      className={cn(
        meetingMetadataSubgridClass,
        meetingMetadataTextClass,
        "items-start gap-y-0.5",
      )}
    >
      {left != null ? (
        <span className="col-start-1 min-w-min">{left}</span>
      ) : null}
      {right != null ? (
        <span className="col-start-2 min-w-0">{right}</span>
      ) : null}
    </span>
  );
}

export function MeetingMetadataField({
  kind,
  children,
  weekly = false,
  overridden = false,
  iconTooltip,
  title,
  showIcon = true,
}: {
  kind: "schedule" | "room" | "audience" | "instructor";
  children: ReactNode;
  weekly?: boolean;
  overridden?: boolean;
  iconTooltip?: (icon: ReactNode) => ReactNode;
  title?: string;
  showIcon?: boolean;
}) {
  const isSchedule = kind === "schedule";
  const iconClass = {
    schedule: weekly
      ? "icon-[lucide--repeat-2]"
      : "icon-[material-symbols--calendar-month-outline-rounded]",
    room: "icon-[material-symbols--location-on-outline-rounded]",
    audience: "icon-[material-symbols--groups-outline-rounded]",
    instructor: "icon-[tabler--user-star]",
  }[kind];
  const icon = (
    <span
      className={cn(
        iconClass,
        "mt-0.5 shrink-0 text-base",
        !isSchedule && "text-base-content/45",
      )}
    />
  );

  return (
    <span
      title={title}
      data-meeting-field={kind}
      className={cn(
        meetingMetadataTextClass,
        "text-base-content/80 flex items-start gap-1.5",
        isSchedule ? "min-w-max whitespace-nowrap" : "max-w-full min-w-0",
      )}
    >
      {showIcon ? (iconTooltip ? iconTooltip(icon) : icon) : null}
      <span
        className={cn(
          "min-w-0",
          isSchedule ? "font-medium tabular-nums" : "wrap-break-word",
          overridden && meetingMetadataOverrideClass,
        )}
      >
        {children}
      </span>
    </span>
  );
}

export function MeetingMetadataLabels({ labels }: { labels: string[] }) {
  return (
    <span className="flex min-w-0 flex-wrap gap-x-2">
      {labels.map((label, index) => (
        <span
          key={`${index}:${label}`}
          className="max-w-full wrap-anywhere whitespace-normal"
        >
          {label}
        </span>
      ))}
    </span>
  );
}
