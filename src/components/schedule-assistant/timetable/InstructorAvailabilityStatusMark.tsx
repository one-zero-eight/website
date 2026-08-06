import type { ReactNode } from "react";

import { InstructorSlotPreferenceLevel } from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";

import type {
  InstructorAvailabilityInfo,
  InstructorAvailabilityStatus,
  InstructorConflictDetail,
} from "./instructorPickerOptions.ts";

const STATUS_DOT_CLASS: Record<InstructorAvailabilityStatus, string> = {
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-error",
};

const MAX_TOOLTIP_CONFLICTS = 5;

const OK_HEADER = "Нет проблем";
const CONFLICTS_HEADER = "В это время есть занятия";

const PREFERENCE_HEADER: Record<InstructorSlotPreferenceLevel, string> = {
  [InstructorSlotPreferenceLevel.preferred]: "Предпочтительное время",
  [InstructorSlotPreferenceLevel.neutral]: "Нейтральное время",
  [InstructorSlotPreferenceLevel.discouraged]: "Нежелательное время",
  [InstructorSlotPreferenceLevel.banned]: "Запрещённое время",
};

function formatConflictMeeting(item: {
  label: string;
  start: string;
  end?: string;
}) {
  if (!item.start) return item.label;
  return `${item.label} (${item.start}${item.end ? `–${item.end}` : ""})`;
}

function conflictWhenLabel(conflict: InstructorConflictDetail): string {
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

export function InstructorAvailabilityStatusMark({
  info,
}: {
  info: InstructorAvailabilityInfo;
}) {
  const visibleConflicts = info.conflicts.slice(0, MAX_TOOLTIP_CONFLICTS);
  const remainingConflicts = info.conflicts.length - visibleConflicts.length;
  const hasConflicts = visibleConflicts.length > 0;
  const hasPreference = !!info.preference;
  const isOk = !hasConflicts && !hasPreference;

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs flex-col gap-2 py-0.5">
          {isOk ? <TooltipSection title={OK_HEADER} /> : null}
          {info.preference ? (
            <TooltipSection title={PREFERENCE_HEADER[info.preference.level]} />
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
