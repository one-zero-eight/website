import type {
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  SelectDropdown,
  type SelectDropdownChangeContext,
  type SelectDropdownOption,
} from "@/components/common/SelectDropdown.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { TERM_WEEKDAY_LABEL_RU } from "@/components/schedule-assistant/settings/weekdays.ts";
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  EditClassAudienceModal,
  EditClassAudienceSummaryRow,
  EditClassPerGroupModal,
} from "./EditClassAudienceModal.tsx";
import {
  applyCreateMeetingToCourse,
  courseComponentOptions,
  coveringSeriesSlots,
  defaultAudienceForCreate,
  defaultCreatePlacement,
  findMatchingSessionSeries,
  parseCourseComponentKey,
  previewCreateSeriesAction,
  seedOccurrenceFromCell,
  seedWeeklyFromCell,
  type ComponentScheduleStatus,
  type CreateMeetingCellContext,
  type CreateMeetingPreset,
  type CreateMeetingViewContext,
  type CreatePlacement,
  type CourseComponentCreateOption,
} from "./createMeetingUtils.ts";
import {
  formatAudienceTokensLabel,
  occurrenceExcludeRef,
  perGroupAudienceOptions,
  timeOptionsForConfig,
  weeklySlotExcludeRef,
} from "./meetingEditUtils.ts";
import {
  instructorPickerDatesForWeekday,
  suggestBestInstructorId,
} from "./instructorPickerOptions.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import { audienceSummaryHintProps } from "./audienceSummaryHints.ts";
import {
  roomPickerDatesForEdit,
  suggestBestRoomId,
} from "./roomPickerOptions.ts";
import { validateSessionSeriesDraft } from "./sessionSeriesValidation.ts";
import { SessionSeriesEditor } from "./SessionSeriesEditor.tsx";
import { normalizeOccurrence, normalizeWeeklySlot } from "./sessionRowMarks.ts";
import { toUiTime, weekdayToKey } from "./sessionSeriesRows.tsx";
import type { TimetableLayoutMode } from "./TimetableLayoutSelector.tsx";
import type { Meeting } from "./timetableViewerModel.ts";
import { dayKey, formatDisplayDate } from "./timetableViewerModel.ts";

function cloneOccurrences(
  items: SchemaSessionOccurrence[] | null | undefined,
): SchemaSessionOccurrence[] {
  return structuredClone(items ?? []);
}

function cloneWeeklySlots(
  items: SchemaWeeklyPatternSlot[] | null | undefined,
): SchemaWeeklyPatternSlot[] {
  return structuredClone(items ?? []);
}

function occurrencesChanged(
  current: SchemaSessionOccurrence[],
  original: SchemaSessionOccurrence[],
) {
  return (
    JSON.stringify(current.map(normalizeOccurrence)) !==
    JSON.stringify(original.map(normalizeOccurrence))
  );
}

function weeklySlotsChanged(
  current: SchemaWeeklyPatternSlot[],
  original: SchemaWeeklyPatternSlot[],
) {
  return (
    JSON.stringify(current.map(normalizeWeeklySlot)) !==
    JSON.stringify(original.map(normalizeWeeklySlot))
  );
}

function CreateClassDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  trailingOption,
}: {
  value: string;
  onChange: (value: string, context?: SelectDropdownChangeContext) => void;
  options: SelectDropdownOption[];
  placeholder: string;
  disabled?: boolean;
  trailingOption?: (query: string) => SelectDropdownOption | null;
}) {
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable
      showHintOnTrigger
      trailingOption={trailingOption}
      className={clsx("w-full", disabled && "pointer-events-none opacity-50")}
      triggerClassName="w-full"
    />
  );
}

function CreateClassField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function statusDotClass(status: ComponentScheduleStatus) {
  if (status === "covered") return "bg-success";
  if (status === "partial") return "bg-warning";
  return "bg-base-content/25";
}

function toSelectOptions(
  options: CourseComponentCreateOption[],
): SelectDropdownOption[] {
  return options.map((item) => ({
    value: item.value,
    label: item.label,
    hint: [item.modeLabel, item.statusLabel].filter(Boolean).join(" · "),
    searchText: item.searchText,
    startAdornment: (
      <span
        className={cn(
          "inline-block size-2.5 shrink-0 rounded-full",
          statusDotClass(item.status),
        )}
      />
    ),
  }));
}

export function CreateClassModal({
  open,
  onOpenChange,
  cellContext,
  config,
  meetings,
  meetingPickerIndex,
  layoutMode,
  viewContext,
  preset,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellContext: CreateMeetingCellContext | null;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingPickerIndex: MeetingPickerIndex;
  layoutMode: TimetableLayoutMode;
  viewContext?: CreateMeetingViewContext;
  preset?: CreateMeetingPreset | null;
  onCreated?: () => void;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const [courseComponentKey, setCourseComponentKey] = useState("");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [placement, setPlacement] = useState<CreatePlacement>(() =>
    layoutMode === "calendar" ? "dates_pattern" : "weekly",
  );
  const [weeklySlots, setWeeklySlots] = useState<SchemaWeeklyPatternSlot[]>([]);
  const [occurrences, setOccurrences] = useState<SchemaSessionOccurrence[]>([]);
  /** Existing series rows kept visible when appending. */
  const [seriesBaselineWeekly, setSeriesBaselineWeekly] = useState(0);
  const [seriesBaselineOccurrences, setSeriesBaselineOccurrences] = useState(0);
  const [originalWeeklySlots, setOriginalWeeklySlots] = useState<
    SchemaWeeklyPatternSlot[]
  >([]);
  const [originalOccurrences, setOriginalOccurrences] = useState<
    SchemaSessionOccurrence[]
  >([]);
  const [deletedWeeklyIndexes, setDeletedWeeklyIndexes] = useState(
    () => new Set<number>(),
  );
  const [deletedOccurrenceIndexes, setDeletedOccurrenceIndexes] = useState(
    () => new Set<number>(),
  );
  const [lockedExistingWeekly, setLockedExistingWeekly] = useState(0);
  const [lockedExistingOccurrences, setLockedExistingOccurrences] = useState(0);
  const [matchedSeriesIdx, setMatchedSeriesIdx] = useState<number | null>(null);
  const [coveringWeeklyRefs, setCoveringWeeklyRefs] = useState<
    { seriesIdx: number; slotIdx: number }[]
  >([]);
  const [coveringOccurrenceRefs, setCoveringOccurrenceRefs] = useState<
    { seriesIdx: number; occIdx: number }[]
  >([]);

  const parsedComponent = useMemo(
    () => parseCourseComponentKey(courseComponentKey),
    [courseComponentKey],
  );

  const selectedCourse = useMemo(() => {
    if (!courses || !parsedComponent) return null;
    return courses[parsedComponent.courseIdx] ?? null;
  }, [courses, parsedComponent]);

  const selectedComponent = useMemo(() => {
    if (!selectedCourse || !parsedComponent) return null;
    return selectedCourse.components?.[parsedComponent.componentIdx] ?? null;
  }, [parsedComponent, selectedCourse]);

  const perGroup = selectedComponent?.per_group ?? false;

  const createOptions = useMemo(() => {
    if (!courses) return [];
    return courseComponentOptions(courses, config, {
      ...viewContext,
      groupId: cellContext?.groupId ?? viewContext?.groupId,
    });
  }, [cellContext?.groupId, config, courses, viewContext]);

  const courseComponentDropdownOptions = useMemo(
    () => toSelectOptions(createOptions),
    [createOptions],
  );

  const selectedOption = useMemo(
    () => createOptions.find((item) => item.value === courseComponentKey),
    [courseComponentKey, createOptions],
  );

  const perGroupOptions = useMemo(() => {
    if (!selectedComponent) return [];
    return perGroupAudienceOptions(config, selectedComponent);
  }, [config, selectedComponent]);

  const componentAudienceLabel = useMemo(() => {
    if (!selectedComponent) return "";
    return formatAudienceTokensLabel(config, selectedComponent.audience || []);
  }, [config, selectedComponent]);

  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);

  const seriesAction = useMemo(() => {
    if (!selectedComponent || !selectedCourse || !audienceValue.length) {
      return selectedOption?.seriesAction ?? null;
    }
    return previewCreateSeriesAction(
      selectedComponent,
      audienceValue,
      config,
      selectedCourse.section_code,
    );
  }, [
    audienceValue,
    config,
    selectedComponent,
    selectedCourse,
    selectedOption?.seriesAction,
  ]);

  const seriesBaseline =
    placement === "weekly" ? seriesBaselineWeekly : seriesBaselineOccurrences;

  const presetKey = preset ? `${preset.courseIdx}:${preset.componentIdx}` : "";

  function seedSeriesDraft(
    component: NonNullable<typeof selectedComponent>,
    audience: string[],
    sectionCode: string,
  ) {
    if (!cellContext) return;
    const seededWeekly = seedWeeklyFromCell(config, cellContext, audience);
    const seededOccurrence = seedOccurrenceFromCell(
      config,
      cellContext,
      audience,
    );
    const matched =
      audience.length > 0
        ? findMatchingSessionSeries(component, audience, config, sectionCode)
        : null;
    const covering =
      audience.length > 0
        ? coveringSeriesSlots(component, audience, config, sectionCode, matched)
        : {
            weekly: [],
            occurrences: [],
            weeklyRefs: [],
            occurrenceRefs: [],
          };
    const foreignWeekly = cloneWeeklySlots(covering.weekly);
    const foreignOccurrences = cloneOccurrences(covering.occurrences);
    const dedicatedWeekly = cloneWeeklySlots(matched?.weekly_pattern);
    const dedicatedOccurrences = cloneOccurrences(matched?.dates_pattern);
    const matchedIdx =
      matched != null ? (component.sessions || []).indexOf(matched) : -1;

    setWeeklySlots([...foreignWeekly, ...dedicatedWeekly, seededWeekly]);
    setOccurrences([
      ...foreignOccurrences,
      ...dedicatedOccurrences,
      seededOccurrence,
    ]);
    setOriginalWeeklySlots([...foreignWeekly, ...dedicatedWeekly]);
    setOriginalOccurrences([...foreignOccurrences, ...dedicatedOccurrences]);
    setLockedExistingWeekly(foreignWeekly.length);
    setLockedExistingOccurrences(foreignOccurrences.length);
    setSeriesBaselineWeekly(foreignWeekly.length + dedicatedWeekly.length);
    setSeriesBaselineOccurrences(
      foreignOccurrences.length + dedicatedOccurrences.length,
    );
    setMatchedSeriesIdx(matchedIdx >= 0 ? matchedIdx : null);
    setCoveringWeeklyRefs(covering.weeklyRefs);
    setCoveringOccurrenceRefs(covering.occurrenceRefs);
    setDeletedWeeklyIndexes(new Set());
    setDeletedOccurrenceIndexes(new Set());
  }

  useEffect(() => {
    if (open) setDismissed(false);
  }, [open]);

  const seededOpenKeyRef = useRef("");

  useEffect(() => {
    if (!open || !cellContext) {
      seededOpenKeyRef.current = "";
      return;
    }
    const seedKey = [
      presetKey,
      cellContext.date,
      cellContext.time,
      cellContext.groupId ?? "",
      (preset?.audience ?? []).join("|"),
    ].join("::");
    if (seededOpenKeyRef.current === seedKey) return;
    seededOpenKeyRef.current = seedKey;

    setCourseComponentKey(presetKey);

    // Seed the final audience immediately (preset or component default) so
    // room/instructor autofill never runs against the cell's single group.
    let audience: string[];
    if (preset?.audience.length) {
      audience = [...preset.audience];
    } else {
      const parsed = parseCourseComponentKey(presetKey);
      const component =
        parsed && courses
          ? (courses[parsed.courseIdx]?.components?.[parsed.componentIdx] ??
            null)
          : null;
      audience =
        component && parsed && courses
          ? defaultAudienceForCreate(
              component,
              config,
              courses[parsed.courseIdx].section_code,
              cellContext.groupId,
            )
          : cellContext.groupId
            ? [cellContext.groupId]
            : [];
    }
    setAudienceValue(audience);
    setAudienceModalOpen(false);

    const parsed = parseCourseComponentKey(presetKey);
    const component =
      parsed && courses
        ? (courses[parsed.courseIdx]?.components?.[parsed.componentIdx] ?? null)
        : null;
    if (component && parsed && courses) {
      seedSeriesDraft(
        component,
        audience,
        courses[parsed.courseIdx].section_code,
      );
    } else {
      setWeeklySlots([seedWeeklyFromCell(config, cellContext, audience)]);
      setOccurrences([seedOccurrenceFromCell(config, cellContext, audience)]);
      setOriginalWeeklySlots([]);
      setOriginalOccurrences([]);
      setSeriesBaselineWeekly(0);
      setSeriesBaselineOccurrences(0);
      setLockedExistingWeekly(0);
      setLockedExistingOccurrences(0);
      setMatchedSeriesIdx(null);
      setCoveringWeeklyRefs([]);
      setCoveringOccurrenceRefs([]);
      setDeletedWeeklyIndexes(new Set());
      setDeletedOccurrenceIndexes(new Set());
    }
    // seedSeriesDraft closes over cellContext/config; intentionally tied to open seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellContext, config, courses, open, preset, presetKey]);

  function handleCourseComponentChange(nextKey: string) {
    setCourseComponentKey(nextKey);
    const parsed = parseCourseComponentKey(nextKey);
    const component =
      parsed && courses
        ? (courses[parsed.courseIdx]?.components?.[parsed.componentIdx] ?? null)
        : null;
    if (!component || !parsed || !courses) {
      setAudienceValue([]);
      setWeeklySlots([]);
      setOccurrences([]);
      setOriginalWeeklySlots([]);
      setOriginalOccurrences([]);
      setSeriesBaselineWeekly(0);
      setSeriesBaselineOccurrences(0);
      setLockedExistingWeekly(0);
      setLockedExistingOccurrences(0);
      setMatchedSeriesIdx(null);
      setCoveringWeeklyRefs([]);
      setCoveringOccurrenceRefs([]);
      setDeletedWeeklyIndexes(new Set());
      setDeletedOccurrenceIndexes(new Set());
      return;
    }
    const audience = defaultAudienceForCreate(
      component,
      config,
      courses[parsed.courseIdx].section_code,
      cellContext?.groupId,
    );
    setAudienceValue(audience);
    seedSeriesDraft(
      component,
      audience,
      courses[parsed.courseIdx].section_code,
    );
  }

  function handleAudienceSave(tokens: string[]) {
    setAudienceValue(tokens);
    if (selectedComponent && selectedCourse) {
      seedSeriesDraft(selectedComponent, tokens, selectedCourse.section_code);
    }
  }

  function handlePerGroupAudienceSave(group: string) {
    const audience = group ? [group] : [];
    setAudienceValue(audience);
    if (selectedComponent && selectedCourse) {
      seedSeriesDraft(selectedComponent, audience, selectedCourse.section_code);
    }
  }

  useEffect(() => {
    if (!open) return;
    setPlacement(
      defaultCreatePlacement(
        selectedCourse,
        parsedComponent?.componentIdx,
        audienceValue,
        config,
        layoutMode,
      ),
    );
    // Do not depend on config/selectedCourse identity: optimistic cache
    // updates would reset the draft while the modal is still open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audienceValue,
    layoutMode,
    open,
    parsedComponent?.componentIdx,
    selectedCourse?.name,
    selectedCourse?.section_code,
  ]);

  useEffect(() => {
    if (!open || !audienceValue.length) return;
    const draftIndex =
      placement === "weekly" ? seriesBaselineWeekly : seriesBaselineOccurrences;

    if (placement === "weekly") {
      setWeeklySlots((slots) => {
        if (draftIndex >= slots.length) return slots;
        const slot = slots[draftIndex]!;
        const needRoom = !String(slot.room || "").trim();
        const needInstructor =
          Boolean(selectedComponent) &&
          !String(
            Array.isArray(slot.instructor)
              ? slot.instructor[0]
              : slot.instructor || "",
          ).trim();
        if (!needRoom && !needInstructor) return slots;

        const weekday = weekdayToKey(String(slot.weekday));
        const start = toUiTime(slot.start_time);
        const end = toUiTime(slot.end_time);
        const dates = roomPickerDatesForEdit({ config, weekday });
        const focusDate = cellContext?.date || dates[0] || "";
        if (!focusDate || !start) return slots;

        const next = { ...slot };
        let changed = false;
        if (needRoom) {
          const room = suggestBestRoomId({
            config,
            meetings,
            date: focusDate,
            dates: dates.length ? dates : [focusDate],
            start,
            end: end || undefined,
            audienceTokens: audienceValue,
            index: meetingPickerIndex,
          });
          if (room) {
            next.room = room;
            changed = true;
          }
        }
        if (needInstructor && selectedComponent) {
          const instructor = suggestBestInstructorId({
            config,
            meetings,
            date: focusDate,
            dates: instructorPickerDatesForWeekday(config, weekday),
            start,
            end: end || undefined,
            weekday,
            courseInstructors: selectedCourse?.instructors,
            instructorPool: selectedComponent.instructor_pool,
            index: meetingPickerIndex,
          });
          if (instructor) {
            next.instructor = instructor;
            changed = true;
          }
        }
        if (!changed) return slots;
        const list = [...slots];
        list[draftIndex] = next;
        return list;
      });
      return;
    }

    setOccurrences((items) => {
      if (draftIndex >= items.length) return items;
      const occurrence = items[draftIndex]!;
      const needRoom = !String(occurrence.room || "").trim();
      const needInstructor =
        Boolean(selectedComponent) &&
        !String(
          Array.isArray(occurrence.instructor)
            ? occurrence.instructor[0]
            : occurrence.instructor || "",
        ).trim();
      if (!needRoom && !needInstructor) return items;

      const date = String(occurrence.date || "").trim();
      const start = toUiTime(occurrence.start_time);
      const end = toUiTime(occurrence.end_time);
      if (!date || !start) return items;
      const weekday = weekdayToKey(dayKey(date));

      const next = { ...occurrence };
      let changed = false;
      if (needRoom) {
        const room = suggestBestRoomId({
          config,
          meetings,
          date,
          dates: [date],
          start,
          end: end || undefined,
          audienceTokens: audienceValue,
          index: meetingPickerIndex,
        });
        if (room) {
          next.room = room;
          changed = true;
        }
      }
      if (needInstructor && selectedComponent) {
        const instructor = suggestBestInstructorId({
          config,
          meetings,
          date,
          dates: [date],
          start,
          end: end || undefined,
          weekday,
          courseInstructors: selectedCourse?.instructors,
          instructorPool: selectedComponent.instructor_pool,
          index: meetingPickerIndex,
        });
        if (instructor) {
          next.instructor = instructor;
          changed = true;
        }
      }
      if (!changed) return items;
      const list = [...items];
      list[draftIndex] = next;
      return list;
    });
  }, [
    audienceValue,
    cellContext?.date,
    config,
    meetingPickerIndex,
    meetings,
    open,
    placement,
    selectedComponent,
    selectedCourse?.instructors,
    seriesBaselineOccurrences,
    seriesBaselineWeekly,
    weeklySlots[seriesBaselineWeekly]?.start_time,
    weeklySlots[seriesBaselineWeekly]?.weekday,
    occurrences[seriesBaselineOccurrences]?.date,
    occurrences[seriesBaselineOccurrences]?.start_time,
  ]);

  function handleClose() {
    if (isPending) return;
    setAudienceModalOpen(false);
    setDismissed(true);
    onOpenChange(false);
  }

  function handleWeeklySlotRemove(index: number) {
    const isOriginalRow = index < originalWeeklySlots.length;
    if (isOriginalRow) {
      setDeletedWeeklyIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      return;
    }

    setWeeklySlots(weeklySlots.filter((_, i) => i !== index));
    setDeletedWeeklyIndexes((prev) => {
      const next = new Set<number>();
      for (const deletedIndex of prev) {
        if (deletedIndex === index) continue;
        next.add(deletedIndex > index ? deletedIndex - 1 : deletedIndex);
      }
      return next;
    });
  }

  function handleOccurrenceRemove(index: number) {
    const isOriginalRow = index < originalOccurrences.length;
    if (isOriginalRow) {
      setDeletedOccurrenceIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      return;
    }

    setOccurrences(occurrences.filter((_, i) => i !== index));
    setDeletedOccurrenceIndexes((prev) => {
      const next = new Set<number>();
      for (const deletedIndex of prev) {
        if (deletedIndex === index) continue;
        next.add(deletedIndex > index ? deletedIndex - 1 : deletedIndex);
      }
      return next;
    });
  }

  function restoreExistingSeriesChanges() {
    const addedWeekly = weeklySlots.slice(originalWeeklySlots.length);
    const addedOccurrences = occurrences.slice(originalOccurrences.length);
    setWeeklySlots([...cloneWeeklySlots(originalWeeklySlots), ...addedWeekly]);
    setOccurrences([
      ...cloneOccurrences(originalOccurrences),
      ...addedOccurrences,
    ]);
    setDeletedWeeklyIndexes(new Set());
    setDeletedOccurrenceIndexes(new Set());
  }

  const existingScheduleChanged =
    seriesAction === "append" &&
    (placement === "weekly"
      ? deletedWeeklyIndexes.size > 0 ||
        (originalWeeklySlots.length > 0 &&
          weeklySlotsChanged(
            weeklySlots.slice(0, originalWeeklySlots.length),
            originalWeeklySlots,
          ))
      : deletedOccurrenceIndexes.size > 0 ||
        (originalOccurrences.length > 0 &&
          occurrencesChanged(
            occurrences.slice(0, originalOccurrences.length),
            originalOccurrences,
          )));

  function handleSubmit() {
    if (isPending) return;
    if (!cellContext || !courses || !parsedComponent || !selectedCourse) {
      showError("Ошибка", "Выберите предмет и компонент.");
      return;
    }
    if (!courseComponentKey) {
      showError("Ошибка", "Выберите предмет и компонент.");
      return;
    }
    if (!audienceValue.length) {
      showError(
        "Ошибка",
        perGroup ? "Выберите группу." : "Укажите хотя бы одну группу.",
      );
      return;
    }

    const seriesError = validateSessionSeriesDraft({
      placement,
      weeklySlots,
      occurrences,
      deletedWeeklyIndexes,
      deletedOccurrenceIndexes,
    });
    if (seriesError) {
      showError("Ошибка", seriesError);
      return;
    }

    const activeWeeklySlots = weeklySlots.filter(
      (_, index) =>
        index >= lockedExistingWeekly && !deletedWeeklyIndexes.has(index),
    );
    const activeOccurrences = occurrences.filter(
      (_, index) =>
        index >= lockedExistingOccurrences &&
        !deletedOccurrenceIndexes.has(index),
    );

    const updatedCourse = applyCreateMeetingToCourse(selectedCourse, config, {
      courseIdx: parsedComponent.courseIdx,
      componentIdx: parsedComponent.componentIdx,
      audience: audienceValue,
      placement,
      weeklySlots: placement === "weekly" ? activeWeeklySlots : undefined,
      occurrences:
        placement === "dates_pattern" ? activeOccurrences : undefined,
    });

    if (!updatedCourse) {
      showError("Ошибка", "Не удалось создать занятие.");
      return;
    }

    mutate(
      {
        params: { path: { course_name: selectedCourse.name } },
        body: updatedCourse,
      },
      {
        onSuccess: () => {
          onCreated?.();
          setAudienceModalOpen(false);
          setDismissed(true);
          onOpenChange(false);
        },
      },
    );
  }

  if (!cellContext) return null;

  const weekdayLabel =
    TERM_WEEKDAY_LABEL_RU[cellContext.weekday] || cellContext.weekday;
  const contextParts = [
    `${formatDisplayDate(cellContext.date)} (${weekdayLabel})`,
    timeOptionsForConfig(
      config,
      cellContext.groupId ? [cellContext.groupId] : [],
    ).find((slot) => slot.value === cellContext.time)?.label ||
      cellContext.time,
    cellContext.groupId ? `группа ${cellContext.groupId}` : null,
  ].filter(Boolean);

  return (
    <Modal
      open={open && !dismissed}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Создать занятие"
      closeOnOutsidePress={!isPending && !audienceModalOpen}
      overlayClassName="!flex items-start justify-center overflow-hidden py-4"
      containerClassName="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="text-base-content/70">{contextParts.join(" · ")}</div>
        </div>

        <CreateClassField label="Предмет · компонент">
          <CreateClassDropdown
            value={courseComponentKey}
            onChange={handleCourseComponentChange}
            placeholder="Выберите предмет и компонент"
            options={courseComponentDropdownOptions}
          />
          {selectedOption ? (
            <p className="text-base-content/55 text-xs">
              {selectedOption.modeLabel
                ? `${selectedOption.modeLabel} · `
                : null}
              расписание: {selectedOption.statusLabel}
              {seriesAction === "append"
                ? " · добавится в существующую серию"
                : " · будет создана новая серия"}
            </p>
          ) : (
            <p className="text-base-content/55 text-xs">
              Точка: не расставлено / частично / всё расставлено.
            </p>
          )}
        </CreateClassField>

        {selectedComponent && selectedCourse && !perGroup ? (
          <EditClassAudienceModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            config={config}
            tokens={audienceValue}
            originalTokens={defaultAudienceForCreate(
              selectedComponent,
              config,
              selectedCourse.section_code,
              cellContext.groupId,
            )}
            originalLabel={componentAudienceLabel}
            onSave={handleAudienceSave}
            sectionCode={selectedCourse.section_code}
          />
        ) : null}

        {selectedComponent && perGroup ? (
          <EditClassPerGroupModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            value={audienceValue[0] || ""}
            options={perGroupOptions}
            onSave={handlePerGroupAudienceSave}
          />
        ) : null}

        <SessionSeriesEditor
          config={config}
          meetings={meetings}
          meetingIndex={meetingPickerIndex}
          placement={placement}
          onPlacementChange={setPlacement}
          afterPlacement={
            selectedComponent ? (
              <EditClassAudienceSummaryRow
                config={config}
                tokens={audienceValue}
                displayLabel={audienceDisplayLabel}
                changed={false}
                originalLabel="—"
                {...audienceSummaryHintProps({
                  perGroup,
                  componentLabel: componentAudienceLabel,
                  context: "component",
                })}
                overridden={Boolean(componentAudienceLabel)}
                onEdit={() => setAudienceModalOpen(true)}
              />
            ) : null
          }
          weeklySlots={weeklySlots}
          onWeeklySlotsChange={setWeeklySlots}
          occurrences={occurrences}
          onOccurrencesChange={setOccurrences}
          audienceTokens={audienceValue}
          courseInstructors={selectedCourse?.instructors}
          instructorPool={selectedComponent?.instructor_pool}
          originalWeeklySlots={
            seriesAction === "append" ? originalWeeklySlots : undefined
          }
          originalOccurrences={
            seriesAction === "append" ? originalOccurrences : undefined
          }
          deletedWeeklyIndexes={
            seriesAction === "append" ? deletedWeeklyIndexes : undefined
          }
          deletedOccurrenceIndexes={
            seriesAction === "append" ? deletedOccurrenceIndexes : undefined
          }
          onRemoveWeekly={
            seriesAction === "append" ? handleWeeklySlotRemove : undefined
          }
          onRemoveOccurrence={
            seriesAction === "append" ? handleOccurrenceRemove : undefined
          }
          highlightFromIndex={seriesAction === "append" ? seriesBaseline : null}
          excludeRefForWeekly={(index) => {
            if (!parsedComponent) return null;
            const covering = coveringWeeklyRefs[index];
            if (covering) {
              return weeklySlotExcludeRef(
                {
                  courseIdx: parsedComponent.courseIdx,
                  componentIdx: parsedComponent.componentIdx,
                  seriesIdx: covering.seriesIdx,
                  date: cellContext.date,
                },
                covering.slotIdx,
              );
            }
            if (matchedSeriesIdx == null || index >= seriesBaselineWeekly) {
              return null;
            }
            return weeklySlotExcludeRef(
              {
                courseIdx: parsedComponent.courseIdx,
                componentIdx: parsedComponent.componentIdx,
                seriesIdx: matchedSeriesIdx,
                date: cellContext.date,
              },
              index - coveringWeeklyRefs.length,
            );
          }}
          excludeRefForOccurrence={(index) => {
            if (!parsedComponent) return null;
            const covering = coveringOccurrenceRefs[index];
            if (covering) {
              return occurrenceExcludeRef(
                {
                  courseIdx: parsedComponent.courseIdx,
                  componentIdx: parsedComponent.componentIdx,
                  seriesIdx: covering.seriesIdx,
                },
                covering.occIdx,
              );
            }
            if (
              matchedSeriesIdx == null ||
              index >= seriesBaselineOccurrences
            ) {
              return null;
            }
            return occurrenceExcludeRef(
              {
                courseIdx: parsedComponent.courseIdx,
                componentIdx: parsedComponent.componentIdx,
                seriesIdx: matchedSeriesIdx,
              },
              index - coveringOccurrenceRefs.length,
            );
          }}
          newOccurrenceDefaults={{
            date: cellContext.date,
            start_time:
              occurrences[seriesBaselineOccurrences]?.start_time ??
              occurrences.at(-1)?.start_time,
            end_time:
              occurrences[seriesBaselineOccurrences]?.end_time ??
              occurrences.at(-1)?.end_time,
            room:
              occurrences[seriesBaselineOccurrences]?.room ??
              occurrences.at(-1)?.room ??
              null,
            instructor:
              occurrences[seriesBaselineOccurrences]?.instructor ??
              occurrences.at(-1)?.instructor ??
              null,
          }}
          newWeeklyDefaults={{
            weekday:
              weeklySlots[seriesBaselineWeekly]?.weekday ??
              weeklySlots.at(-1)?.weekday ??
              termWeekdayKeyToWeekday(cellContext.weekday),
            start_time:
              weeklySlots[seriesBaselineWeekly]?.start_time ??
              weeklySlots.at(-1)?.start_time,
            end_time:
              weeklySlots[seriesBaselineWeekly]?.end_time ??
              weeklySlots.at(-1)?.end_time,
            room:
              weeklySlots[seriesBaselineWeekly]?.room ??
              weeklySlots.at(-1)?.room ??
              null,
            instructor:
              weeklySlots[seriesBaselineWeekly]?.instructor ??
              weeklySlots.at(-1)?.instructor ??
              null,
          }}
        />

        <div className="flex items-center justify-end gap-3">
          {existingScheduleChanged ? (
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content/80 text-sm"
              disabled={isPending}
              onClick={restoreExistingSeriesChanges}
            >
              Сбросить изменения
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={handleClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary relative"
            disabled={isPending}
            onClick={handleSubmit}
          >
            <span className={cn(isPending && "invisible")}>
              {seriesAction === "append" ? "Добавить" : "Создать"}
            </span>
            {isPending ? (
              <span className="loading loading-spinner loading-sm absolute inset-0 m-auto" />
            ) : null}
          </button>
        </div>
      </div>
    </Modal>
  );
}
