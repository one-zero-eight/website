import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { cn } from "@/lib/ui/cn";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

import { buildInstructorPickerOptions } from "./instructorPickerOptions.ts";
import type { MeetingRef } from "./meetingEditUtils.ts";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";
import { weeklyPickerSlots } from "./meetingPickerSchedule.ts";
import type { Meeting } from "./timetableViewerModel.ts";

export function InstructorPicker({
  config,
  meetings,
  meetingIndex,
  extraMeetings,
  pickerSelection,
  value,
  weekday,
  date,
  weeklySlot,
  audienceTokens,
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
  extraMeetings?: Meeting[];
  pickerSelection?: Meeting[];
  value: string;
  weekday: TermWeekdayKey;
  date?: string;
  weeklySlot?: SchemaWeeklyPatternSlot;
  audienceTokens?: string[];
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
    weeklySlot,
    audienceTokens,
  ]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const buildOptions = useCallback(
    (selection?: Meeting[]) => {
      const explicitDate = date?.trim();
      const slots = explicitDate
        ? [{ date: explicitDate, start, end }]
        : weeklySlot
          ? weeklyPickerSlots(
              config,
              weeklySlot,
              audienceTokens ?? [],
              "instructor",
            )
          : [];
      const dates = slots.map((slot) => slot.date);
      const empty = allowEmpty ? [{ value: "", label: "—" }] : [];
      const hasExtras = Boolean(extraMeetings?.length);
      const meetingsForStatus = hasExtras
        ? [...meetings, ...extraMeetings!]
        : meetings;
      const indexForStatus = hasExtras
        ? buildMeetingPickerIndex(meetingsForStatus)
        : meetingIndex;
      return [
        ...empty,
        ...buildInstructorPickerOptions({
          config,
          meetings: meetingsForStatus,
          dates,
          weekly: Boolean(weeklySlot) || Boolean(selection?.length),
          selection,
          slots,
          start: start.slice(0, 5),
          end: end.slice(0, 5) || undefined,
          weekday,
          courseInstructors,
          instructorPool,
          excludeRef,
          excludeInstanceId,
          includeInstructorIds: value ? [value] : undefined,
          index: indexForStatus,
          includeStatus: statusReady,
        }),
      ];
    },
    [
      allowEmpty,
      config,
      courseInstructors,
      date,
      end,
      excludeInstanceId,
      excludeRef,
      extraMeetings,
      instructorPool,
      meetingIndex,
      meetings,
      start,
      statusReady,
      value,
      weekday,
      weeklySlot,
      audienceTokens,
    ],
  );

  const options = useMemo(() => buildOptions(), [buildOptions]);
  const activeSelection = pickerOpen ? pickerSelection : undefined;
  const menuOptions = useMemo(
    () => (activeSelection?.length ? buildOptions(activeSelection) : options),
    [activeSelection, buildOptions, options],
  );

  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={menuOptions}
      triggerOption={options.find((option) => option.value === value)}
      onOpenChange={setPickerOpen}
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
