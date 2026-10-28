import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";

import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";

import { formatPickerConflictDates } from "./pickerLabels.ts";
import type {
  RoomAvailabilityInfo,
  RoomAvailabilityStatus,
} from "./roomPickerOptions.ts";

const STATUS_DOT_CLASS: Record<RoomAvailabilityStatus, string> = {
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-error",
};

function formatConflictMeeting(item: {
  label: string;
  start: string;
  end?: string;
}) {
  if (!item.start) return item.label;
  return `${item.label} (${item.start}${item.end ? `–${item.end}` : ""})`;
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
  const { t } = useLingui();

  if (!info) {
    return (
      <span
        className="bg-base-content/25 inline-block size-2.5 shrink-0 rounded-full"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  const checkedDateCount = new Set(info.checkedDates).size;
  const conflictDateCount = new Set(info.conflictDates).size;
  const hasCapacity = !!info.capacityIssue;
  const hasConflicts = conflictDateCount > 0;
  const isOk = checkedDateCount > 0 && !hasCapacity && !hasConflicts;
  const capacity = info.capacityIssue?.capacity;
  const needed = info.capacityIssue?.needed;

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs flex-col gap-2 py-0.5 wrap-break-word whitespace-normal">
          {!checkedDateCount ? (
            <TooltipSection title={t`No class dates`} />
          ) : null}
          {isOk ? <TooltipSection title={t`No issues`} /> : null}
          {info.capacityIssue ? (
            <TooltipSection title={t`Insufficient capacity`}>
              <div className="text-sm">{t`${capacity} < ${needed} needed`}</div>
            </TooltipSection>
          ) : null}
          {hasConflicts ? (
            <TooltipSection
              title={t`Busy at the selected time on ${conflictDateCount} of ${checkedDateCount} dates`}
            >
              <div className="text-base-content/80 text-sm">
                {formatPickerConflictDates(info.conflictDates)}
              </div>
              <ul className="flex flex-col gap-1">
                {info.conflicts.map((conflict, index) => (
                  <li
                    key={`${conflict.meeting.label}-${index}`}
                    className="text-sm"
                  >
                    {formatConflictMeeting(conflict.meeting)}
                    <span className="text-base-content/80">
                      {" "}
                      · {formatPickerConflictDates(conflict.dates)}
                    </span>
                  </li>
                ))}
              </ul>
            </TooltipSection>
          ) : null}
        </div>
      }
    >
      <span
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full",
          checkedDateCount
            ? STATUS_DOT_CLASS[info.status]
            : "bg-base-content/25",
        )}
        onClick={(e) => e.stopPropagation()}
      />
    </Tooltip>
  );
}
