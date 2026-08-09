import type { ReactNode } from "react";

import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";

import type {
  RoomAvailabilityInfo,
  RoomAvailabilityStatus,
  RoomConflictDetail,
} from "./roomPickerOptions.ts";

const STATUS_DOT_CLASS: Record<RoomAvailabilityStatus, string> = {
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-error",
};

const MAX_TOOLTIP_CONFLICTS = 5;

const CAPACITY_HEADER = "Недостаточная вместимость";
const CONFLICTS_HEADER = "В это время есть занятия";
const OK_HEADER = "Нет проблем";

function formatConflictMeeting(item: {
  label: string;
  start: string;
  end?: string;
}) {
  if (!item.start) return item.label;
  return `${item.label} (${item.start}${item.end ? `–${item.end}` : ""})`;
}

function conflictWhenLabel(conflict: RoomConflictDetail): string {
  if (conflict.weekly) return "каждую неделю";
  return conflict.dates[0] || "—";
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-base-content/60 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </div>
  );
}

function TooltipSection({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

export function RoomAvailabilityStatusMark({
  info,
}: {
  info: RoomAvailabilityInfo | null;
}) {
  if (!info) {
    return (
      <span
        className="bg-base-content/25 inline-block size-2.5 shrink-0 rounded-full"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  const visibleConflicts = info.conflicts.slice(0, MAX_TOOLTIP_CONFLICTS);
  const remainingConflicts = info.conflicts.length - visibleConflicts.length;
  const hasCapacity = !!info.capacityIssue;
  const hasConflicts = visibleConflicts.length > 0;
  const isOk = !hasCapacity && !hasConflicts;

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs flex-col gap-2 py-0.5">
          {isOk ? <TooltipSection title={OK_HEADER} /> : null}
          {info.capacityIssue ? (
            <TooltipSection title={CAPACITY_HEADER}>
              <div className="text-sm">
                {info.capacityIssue.capacity} &lt; нужно{" "}
                {info.capacityIssue.needed}
              </div>
            </TooltipSection>
          ) : null}
          {hasConflicts ? (
            <TooltipSection title={CONFLICTS_HEADER}>
              <ul className="flex flex-col gap-1">
                {visibleConflicts.map((conflict, index) => (
                  <li
                    key={`${conflictWhenLabel(conflict)}-${conflict.meeting.label}-${index}`}
                    className="text-sm"
                  >
                    {formatConflictMeeting(conflict.meeting)}
                    <span className="text-base-content/80">
                      {" "}
                      · {conflictWhenLabel(conflict)}
                    </span>
                  </li>
                ))}
              </ul>
              {remainingConflicts > 0 ? (
                <div className="text-base-content/60 text-sm">
                  и ещё {remainingConflicts} конфликтов
                </div>
              ) : null}
            </TooltipSection>
          ) : null}
        </div>
      }
    >
      <span
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full",
          STATUS_DOT_CLASS[info.status],
        )}
        onClick={(e) => e.stopPropagation()}
      />
    </Tooltip>
  );
}
