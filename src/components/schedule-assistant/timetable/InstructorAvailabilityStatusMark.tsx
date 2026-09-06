import type { ReactNode } from "react";

import { InstructorSlotPreferenceLevel } from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";

import type {
  InstructorAvailabilityInfo,
  InstructorAvailabilityStatus,
} from "./instructorPickerOptions.ts";
import { formatPickerConflictDates } from "./pickerLabels.ts";

const STATUS_DOT_CLASS: Record<InstructorAvailabilityStatus, string> = {
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-error",
};

const OK_HEADER = "Нет проблем";
const NO_DATES_HEADER = "Нет дат проведения";

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
  info: InstructorAvailabilityInfo | null;
}) {
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
  const hasConflicts = conflictDateCount > 0;
  const hasPreference = !!info.preference;
  const isOk = checkedDateCount > 0 && !hasConflicts && !hasPreference;

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs flex-col gap-2 py-0.5 wrap-break-word whitespace-normal">
          {!checkedDateCount ? (
            <TooltipSection title={NO_DATES_HEADER} />
          ) : null}
          {isOk ? <TooltipSection title={OK_HEADER} /> : null}
          {info.preference ? (
            <TooltipSection title={PREFERENCE_HEADER[info.preference.level]} />
          ) : null}
          {hasConflicts ? (
            <TooltipSection
              title={`В выбранное время занято в ${conflictDateCount} из ${checkedDateCount} дат`}
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
