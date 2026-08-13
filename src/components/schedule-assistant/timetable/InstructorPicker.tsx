import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useState, startTransition } from "react";

import { buildInstructorPickerOptions } from "./instructorPickerOptions.ts";
import type { MeetingRef } from "./meetingEditUtils.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import { roomPickerDatesForEdit } from "./roomPickerOptions.ts";
import type { Meeting } from "./timetableViewerModel.ts";

export function InstructorPicker({
  config,
  meetings,
  meetingIndex,
  value,
  weekday,
  date,
  start,
  end,
  courseInstructors,
  instructorPool,
  excludeRef,
  excludeInstanceId,
  onChange,
  placeholder = "Преподаватель",
  allowEmpty = true,
  className,
  triggerClassName,
  menuClassName,
  matchTriggerWidth = false,
  showHintOnTrigger = true,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  value: string;
  weekday: TermWeekdayKey;
  date?: string;
  start: string;
  end: string;
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  excludeRef?: MeetingRef | null;
  excludeInstanceId?: string | null;
  onChange: (instructorId: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  matchTriggerWidth?: boolean;
  showHintOnTrigger?: boolean;
}) {
  const [statusReady, setStatusReady] = useState(false);

  useEffect(() => {
    if (statusReady) return;
    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        startTransition(() => {
          if (!cancelled) setStatusReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [
    courseInstructors,
    date,
    end,
    excludeInstanceId,
    excludeRef,
    instructorPool,
    meetingIndex,
    start,
    statusReady,
    value,
    weekday,
  ]);

  const options = useMemo(() => {
    const dates = date?.trim()
      ? [date.trim()]
      : roomPickerDatesForEdit({ config, weekday });
    const focusDate = date?.trim() || dates[0] || "";
    const empty = allowEmpty ? [{ value: "", label: "—" }] : [];
    if (!focusDate || !start.trim() || !meetingIndex) {
      return empty;
    }
    return [
      ...empty,
      ...buildInstructorPickerOptions({
        config,
        meetings,
        date: focusDate,
        dates: dates.length ? dates : [focusDate],
        start: start.slice(0, 5),
        end: end.slice(0, 5) || undefined,
        weekday,
        courseInstructors,
        instructorPool,
        excludeRef,
        excludeInstanceId,
        includeInstructorIds: value ? [value] : undefined,
        index: meetingIndex,
        includeStatus: statusReady,
      }),
    ];
  }, [
    allowEmpty,
    config,
    courseInstructors,
    date,
    end,
    excludeInstanceId,
    excludeRef,
    instructorPool,
    meetingIndex,
    meetings,
    start,
    statusReady,
    value,
    weekday,
  ]);

  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable
      matchTriggerWidth={matchTriggerWidth}
      showHintOnTrigger={showHintOnTrigger}
      className={cn("w-full min-w-0", className)}
      triggerClassName={cn("btn-sm w-full justify-between", triggerClassName)}
      menuClassName={cn("min-w-[min(100vw-2rem,22rem)]", menuClassName)}
    />
  );
}
