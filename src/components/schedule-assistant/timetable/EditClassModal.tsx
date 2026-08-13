import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import {
  EditClassAudienceModal,
  EditClassAudienceSummaryRow,
  EditClassPerGroupModal,
} from "./EditClassAudienceModal.tsx";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import type { CreatePlacement } from "./createMeetingUtils.ts";
import {
  applyMeetingEditsToCourse,
  applySeriesScheduleToCourse,
  formatAudienceTokensLabel,
  isMeetingAudienceOverridden,
  meetingAudienceEqual,
  meetingEditOriginalValues,
  meetingInstructorsLabel,
  occurrenceExcludeRef,
  parseMeetingInstanceId,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
  weeklySlotExcludeRef,
  type EditClassScope,
  type MeetingFieldEdits,
  type MeetingOriginalValues,
} from "./meetingEditUtils.ts";
import { MeetingOverrideIndicator } from "./meetingOverrideIndicator.tsx";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";
import { audienceSummaryHintProps } from "./audienceSummaryHints.ts";
import { normalizeOccurrence, normalizeWeeklySlot } from "./sessionRowMarks.ts";
import { toApiTime, toUiTime, weekdayToKey } from "./sessionSeriesRows.tsx";
import { SessionSeriesEditor } from "./SessionSeriesEditor.tsx";
import {
  instructorValue,
  validateSessionSeriesDraft,
} from "./sessionSeriesValidation.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import { formatDisplayDate } from "./timetableViewerModel.ts";

const SCOPE_OPTIONS: { value: EditClassScope; label: string }[] = [
  { value: "single", label: "Только это занятие" },
  { value: "future", label: "Это и все следующие" },
  { value: "all", label: "Все занятия (включая прошлые)" },
];

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

/** True when slot list length changed or a non-focus slot differs. */
function weeklyStructuralChanged(
  current: SchemaWeeklyPatternSlot[],
  original: SchemaWeeklyPatternSlot[],
  focusIndex: number,
) {
  if (current.length !== original.length) return true;
  for (let index = 0; index < current.length; index += 1) {
    if (index === focusIndex) continue;
    if (
      JSON.stringify(normalizeWeeklySlot(current[index]!)) !==
      JSON.stringify(normalizeWeeklySlot(original[index]!))
    ) {
      return true;
    }
  }
  return false;
}

function buildWeeklyFocusFieldEdits(
  originals: MeetingOriginalValues,
  slot: SchemaWeeklyPatternSlot | undefined,
  audienceValue: string[],
): MeetingFieldEdits {
  const edits: MeetingFieldEdits = {};
  if (!meetingAudienceEqual(audienceValue, originals.audience)) {
    edits.audience = audienceValue;
  }
  if (!slot) return edits;

  const room = String(slot.room || "").trim();
  const time = toUiTime(slot.start_time);
  const endTime = toUiTime(slot.end_time);
  const weekday = weekdayToKey(String(slot.weekday || ""));
  const instructor = instructorValue(slot.instructor);
  if (room !== originals.room) edits.room = room;
  if (time !== originals.time || endTime !== originals.endTime) {
    edits.time = time;
    if (endTime) edits.endTime = endTime;
  }
  if (weekday !== originals.weekday) edits.weekday = weekday;
  if (instructor !== originals.instructor) edits.instructor = instructor;
  return edits;
}

function hasMeetingFieldEdits(edits: MeetingFieldEdits) {
  if (edits.cancel) return true;
  return (
    edits.room !== undefined ||
    edits.time !== undefined ||
    edits.endTime !== undefined ||
    edits.weekday !== undefined ||
    edits.date !== undefined ||
    edits.instructor !== undefined ||
    edits.audience !== undefined
  );
}

function seedOccurrenceFromMeeting(
  originals: MeetingOriginalValues,
  config: SchemaScheduleConfig,
  audience: string[],
): SchemaSessionOccurrence {
  const start = originals.time || "09:00";
  const end =
    originals.endTime ||
    resolveEndTimeForStart(config, start, audience).slice(0, 5);
  return {
    date: originals.date,
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: originals.room || null,
    instructor: originals.instructor || null,
  };
}

function seedWeeklyFromMeeting(
  originals: MeetingOriginalValues,
  config: SchemaScheduleConfig,
  audience: string[],
): SchemaWeeklyPatternSlot {
  const start = originals.time || "09:00";
  const end =
    originals.endTime ||
    resolveEndTimeForStart(config, start, audience).slice(0, 5);
  return {
    weekday: termWeekdayKeyToWeekday(originals.weekday),
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: originals.room || null,
    instructor: originals.instructor || null,
    edits: null,
  };
}

export function EditClassModal({
  open,
  onOpenChange,
  meeting,
  config,
  meetings,
  meetingPickerIndex: _meetingPickerIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingPickerIndex: MeetingPickerIndex;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();
  const [scope, setScope] = useState<EditClassScope>("single");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [cancelChecked, setCancelChecked] = useState(false);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [placement, setPlacement] = useState<CreatePlacement>("weekly");
  const [weeklySlots, setWeeklySlots] = useState<SchemaWeeklyPatternSlot[]>([]);
  const [occurrences, setOccurrences] = useState<SchemaSessionOccurrence[]>([]);
  const [originalWeeklySlots, setOriginalWeeklySlots] = useState<
    SchemaWeeklyPatternSlot[]
  >([]);
  const [originalOccurrences, setOriginalOccurrences] = useState<
    SchemaSessionOccurrence[]
  >([]);
  const [deletedOccurrenceIndexes, setDeletedOccurrenceIndexes] = useState(
    () => new Set<number>(),
  );
  const [deletedWeeklySlotIndexes, setDeletedWeeklySlotIndexes] = useState(
    () => new Set<number>(),
  );

  const meetingRef = useMemo(
    () => (meeting ? parseMeetingInstanceId(meeting.instance_id) : null),
    [meeting],
  );

  const originalPlacement: CreatePlacement =
    meetingRef?.kind === "occ" ? "occurrences" : "weekly";

  const focusIndex =
    meetingRef?.kind === "occ"
      ? meetingRef.occIdx
      : meetingRef?.kind === "wp"
        ? meetingRef.slotIdx
        : 0;

  const meetingComponent = useMemo(() => {
    if (!meeting || !courses || !meetingRef) return null;
    const course = courses.find((item) => item.name === meeting.course);
    return course?.components?.[meetingRef.componentIdx] ?? null;
  }, [courses, meeting, meetingRef]);

  const meetingSeries = useMemo(() => {
    if (!meetingComponent || !meetingRef) return null;
    return meetingComponent.sessions?.[meetingRef.seriesIdx] ?? null;
  }, [meetingComponent, meetingRef]);

  const originals = useMemo(() => {
    if (!meeting) return null;
    return meetingEditOriginalValues(meeting, meetingComponent, meetingSeries);
  }, [meeting, meetingComponent, meetingSeries]);

  const perGroup = meetingComponent?.per_group ?? false;

  const perGroupOptions = useMemo(() => {
    if (!meetingComponent) return [];
    return perGroupAudienceOptions(config, meetingComponent);
  }, [config, meetingComponent]);

  const courseInstructors = useMemo(() => {
    if (!meeting || !courses) return undefined;
    return courses.find((item) => item.name === meeting.course)?.instructors;
  }, [courses, meeting]);

  const conflictMeetings = useMemo(() => {
    if (!meeting || !meetingRef) return meetings;

    const sameSeries = (
      ref: ReturnType<typeof parseMeetingInstanceId>,
    ): ref is NonNullable<typeof ref> =>
      !!ref &&
      ref.courseIdx === meetingRef.courseIdx &&
      ref.componentIdx === meetingRef.componentIdx &&
      ref.seriesIdx === meetingRef.seriesIdx;

    if (placement === "weekly") {
      // Weekly placement replaces date events for this series.
      return meetings.filter((item) => {
        const ref = parseMeetingInstanceId(item.instance_id);
        if (!sameSeries(ref)) return true;
        if (ref.kind === "occ") return false;
        if (ref.kind === "wp" && deletedWeeklySlotIndexes.has(ref.slotIdx)) {
          return false;
        }
        return true;
      });
    }

    const stripped = meetings.filter((item) => {
      const ref = parseMeetingInstanceId(item.instance_id);
      if (!sameSeries(ref)) return true;
      // Dates placement replaces both saved occ rows and weekly instances.
      return false;
    });
    const drafts: Meeting[] = [];
    for (const [index, occurrence] of occurrences.entries()) {
      if (deletedOccurrenceIndexes.has(index)) continue;
      const date = String(occurrence.date || "").trim();
      if (!date) continue;
      drafts.push({
        instance_id: `${meetingRef.courseIdx}:${meetingRef.componentIdx}:${meetingRef.seriesIdx}:occ:${index}`,
        course: meeting.course,
        course_short_name: meeting.course_short_name,
        tag: meeting.tag,
        groups: audienceValue,
        date,
        start: toUiTime(occurrence.start_time),
        end: toUiTime(occurrence.end_time) || undefined,
        room: String(occurrence.room || "").trim(),
        instructors: instructorValue(occurrence.instructor),
        instructor_pool: meeting.instructor_pool || [],
        sections: meeting.sections || [],
      });
    }
    return [...stripped, ...drafts];
  }, [
    audienceValue,
    deletedOccurrenceIndexes,
    deletedWeeklySlotIndexes,
    meeting,
    meetingRef,
    meetings,
    occurrences,
    placement,
  ]);

  const conflictMeetingIndex = useMemo(
    () => buildMeetingPickerIndex(conflictMeetings),
    [conflictMeetings],
  );

  useEffect(() => {
    if (!open || !meeting || !originals) return;
    setScope("single");
    const audience = minimizeAudienceTokens(
      [...originals.audience],
      buildAudienceSelectorTree(config),
    );
    setAudienceValue(audience);
    setCancelChecked(false);
    setPlacement(originalPlacement);
    setDeletedOccurrenceIndexes(new Set());
    setDeletedWeeklySlotIndexes(new Set());

    const occFromSeries = cloneOccurrences(meetingSeries?.occurrences);
    const weeklyFromSeries = cloneWeeklySlots(meetingSeries?.weekly_pattern);
    const seededOcc =
      occFromSeries.length > 0
        ? occFromSeries
        : [seedOccurrenceFromMeeting(originals, config, audience)];
    const seededWeekly =
      weeklyFromSeries.length > 0
        ? weeklyFromSeries
        : [seedWeeklyFromMeeting(originals, config, audience)];

    setOccurrences(seededOcc);
    setWeeklySlots(seededWeekly);
    setOriginalOccurrences(
      cloneOccurrences(
        originalPlacement === "occurrences" ? seededOcc : occFromSeries,
      ),
    );
    setOriginalWeeklySlots(
      cloneWeeklySlots(
        originalPlacement === "weekly" ? seededWeekly : weeklyFromSeries,
      ),
    );
  }, [
    config,
    meeting,
    meetingRef?.kind,
    meetingSeries,
    open,
    originalPlacement,
    originals,
  ]);

  function handleClose() {
    if (isPending) return;
    setAudienceModalOpen(false);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!meeting || !meetingRef || !courses || !originals) return;
    const course = courses.find((item) => item.name === meeting.course);
    if (!course) {
      showError("Ошибка", "Курс не найден в конфигурации.");
      return;
    }

    if (cancelChecked) {
      const updatedCourse = applyMeetingEditsToCourse(
        course,
        meetingRef,
        meeting,
        config,
        scope,
        { cancel: true },
      );
      if (!updatedCourse) {
        showError("Ошибка", "Не удалось отменить занятие.");
        return;
      }
      mutate(
        {
          params: { path: { course_name: course.name } },
          body: updatedCourse,
        },
        {
          onSuccess: () => {
            showSuccess("Сохранено", "Занятие отменено.");
            handleClose();
          },
          onError: (error) => {
            showError("Ошибка сохранения", formatApiErrorMessage(error));
          },
        },
      );
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
      deletedWeeklyIndexes: deletedWeeklySlotIndexes,
      deletedOccurrenceIndexes: deletedOccurrenceIndexes,
    });
    if (seriesError) {
      showError("Ошибка", seriesError);
      return;
    }

    const audienceChanged = !meetingAudienceEqual(
      audienceValue,
      originals.audience,
    );
    const placementChanged = placement !== originalPlacement;
    const activeOccurrences = occurrences.filter(
      (_, index) => !deletedOccurrenceIndexes.has(index),
    );
    const activeWeeklySlots = weeklySlots.filter(
      (_, index) => !deletedWeeklySlotIndexes.has(index),
    );
    const scheduleDirty =
      placementChanged ||
      (placement === "occurrences"
        ? deletedOccurrenceIndexes.size > 0 ||
          occurrencesChanged(activeOccurrences, originalOccurrences)
        : deletedWeeklySlotIndexes.size > 0 ||
          weeklySlotsChanged(activeWeeklySlots, originalWeeklySlots));

    if (!audienceChanged && !scheduleDirty) {
      showError("Ошибка", "Нет изменений для сохранения.");
      return;
    }

    let updatedCourse: SchemaCourseConfig | null = null;

    if (placementChanged) {
      updatedCourse = applySeriesScheduleToCourse(course, meetingRef, config, {
        audience: audienceChanged ? audienceValue : undefined,
        occurrences: placement === "occurrences" ? activeOccurrences : null,
        weeklyPattern: placement === "weekly" ? activeWeeklySlots : null,
      });
    } else if (placement === "occurrences") {
      updatedCourse = applySeriesScheduleToCourse(course, meetingRef, config, {
        audience: audienceChanged ? audienceValue : undefined,
        occurrences: scheduleDirty ? activeOccurrences : undefined,
      });
    } else {
      const structural =
        deletedWeeklySlotIndexes.size > 0 ||
        weeklySlots.length !== originalWeeklySlots.length ||
        weeklyStructuralChanged(weeklySlots, originalWeeklySlots, focusIndex);
      const focusEdits = buildWeeklyFocusFieldEdits(
        originals,
        deletedWeeklySlotIndexes.has(focusIndex)
          ? undefined
          : weeklySlots[focusIndex],
        audienceValue,
      );

      if (structural) {
        updatedCourse = applySeriesScheduleToCourse(
          course,
          meetingRef,
          config,
          {
            audience: audienceChanged ? audienceValue : undefined,
            weeklyPattern: activeWeeklySlots,
            occurrences: null,
          },
        );
      } else if (hasMeetingFieldEdits(focusEdits)) {
        updatedCourse = applyMeetingEditsToCourse(
          course,
          meetingRef,
          meeting,
          config,
          scope,
          focusEdits,
        );
      }
    }

    if (!updatedCourse) {
      showError("Ошибка", "Не удалось применить изменение к занятию.");
      return;
    }

    mutate(
      {
        params: { path: { course_name: course.name } },
        body: updatedCourse,
      },
      {
        onSuccess: () => {
          showSuccess("Сохранено", "Изменения занятия применены.");
          handleClose();
        },
        onError: (error) => {
          showError("Ошибка сохранения", formatApiErrorMessage(error));
        },
      },
    );
  }

  if (!meeting || !originals) return null;

  const instructorsLabel = meetingInstructorsLabel(meeting.instructors);
  const title = `${meeting.course} (${meeting.tag})`;
  const audienceChanged =
    !cancelChecked && !meetingAudienceEqual(audienceValue, originals.audience);
  const originalAudienceLabel = formatAudienceTokensLabel(
    config,
    originals.audience,
  );
  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);
  const placementChanged = placement !== originalPlacement;
  const activeOccurrences = occurrences.filter(
    (_, index) => !deletedOccurrenceIndexes.has(index),
  );
  const activeWeeklySlots = weeklySlots.filter(
    (_, index) => !deletedWeeklySlotIndexes.has(index),
  );
  const scheduleChanged =
    !cancelChecked &&
    (placementChanged ||
      (placement === "occurrences"
        ? deletedOccurrenceIndexes.size > 0 ||
          occurrencesChanged(activeOccurrences, originalOccurrences)
        : deletedWeeklySlotIndexes.size > 0 ||
          weeklySlotsChanged(activeWeeklySlots, originalWeeklySlots)));
  const weeklyStructural =
    placement === "weekly" &&
    !placementChanged &&
    !cancelChecked &&
    (deletedWeeklySlotIndexes.size > 0 ||
      weeklySlots.length !== originalWeeklySlots.length ||
      weeklyStructuralChanged(weeklySlots, originalWeeklySlots, focusIndex));
  const showApplyScope =
    cancelChecked ||
    (placement === "weekly" && !weeklyStructural && !placementChanged);
  const canSave = cancelChecked || audienceChanged || scheduleChanged;
  const groupsOverridden = isMeetingAudienceOverridden(
    config,
    meetingComponent,
    meetingSeries,
  );
  const componentAudienceLabel = meetingComponent
    ? formatAudienceTokensLabel(config, meetingComponent.student_groups || [])
    : "";

  function restoreScheduleOriginals() {
    if (!originals) return;
    setPlacement(originalPlacement);
    setDeletedOccurrenceIndexes(new Set());
    setDeletedWeeklySlotIndexes(new Set());
    setWeeklySlots(
      originalWeeklySlots.length > 0
        ? cloneWeeklySlots(originalWeeklySlots)
        : [seedWeeklyFromMeeting(originals, config, audienceValue)],
    );
    setOccurrences(
      originalOccurrences.length > 0
        ? cloneOccurrences(originalOccurrences)
        : [seedOccurrenceFromMeeting(originals, config, audienceValue)],
    );
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

  function handleWeeklySlotRemove(index: number) {
    const isOriginalRow = index < originalWeeklySlots.length;
    if (isOriginalRow) {
      setDeletedWeeklySlotIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      return;
    }

    setWeeklySlots(weeklySlots.filter((_, i) => i !== index));
    setDeletedWeeklySlotIndexes((prev) => {
      const next = new Set<number>();
      for (const deletedIndex of prev) {
        if (deletedIndex === index) continue;
        next.add(deletedIndex > index ? deletedIndex - 1 : deletedIndex);
      }
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Редактировать занятие"
      closeOnOutsidePress={!isPending && !audienceModalOpen}
      overlayClassName="!flex items-start justify-center overflow-hidden py-4"
      containerClassName="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{title}</div>
            <MeetingOverrideIndicator fields={meeting.override_fields} />
          </div>
          <div className="text-base-content/70 mt-1">
            {formatDisplayDate(meeting.date)} {meeting.start}
            {meeting.room ? ` · ${meeting.room}` : ""}
            {instructorsLabel ? ` · ${instructorsLabel}` : ""}
          </div>
        </div>

        <SessionSeriesEditor
          config={config}
          meetings={conflictMeetings}
          meetingIndex={conflictMeetingIndex}
          placement={placement}
          onPlacementChange={(next) => {
            if (next === "occurrences") setCancelChecked(false);
            setPlacement(next);
          }}
          placementDisabled={cancelChecked}
          afterPlacement={
            <EditClassAudienceSummaryRow
              config={config}
              tokens={audienceValue}
              displayLabel={audienceDisplayLabel}
              disabled={cancelChecked}
              changed={audienceChanged}
              originalLabel={originalAudienceLabel}
              onRestoreOriginal={() =>
                setAudienceValue(
                  minimizeAudienceTokens(
                    [...originals.audience],
                    buildAudienceSelectorTree(config),
                  ),
                )
              }
              {...audienceSummaryHintProps({
                perGroup,
                componentLabel: componentAudienceLabel,
                context: "template",
              })}
              overridden={
                perGroup
                  ? !audienceChanged && Boolean(componentAudienceLabel)
                  : groupsOverridden
              }
              onEdit={() => setAudienceModalOpen(true)}
            />
          }
          weeklySlots={weeklySlots}
          onWeeklySlotsChange={setWeeklySlots}
          occurrences={occurrences}
          onOccurrencesChange={setOccurrences}
          audienceTokens={audienceValue}
          courseInstructors={courseInstructors}
          instructorPool={meetingComponent?.instructor_pool}
          originalWeeklySlots={originalWeeklySlots}
          originalOccurrences={originalOccurrences}
          deletedWeeklyIndexes={deletedWeeklySlotIndexes}
          deletedOccurrenceIndexes={deletedOccurrenceIndexes}
          onRemoveWeekly={handleWeeklySlotRemove}
          onRemoveOccurrence={handleOccurrenceRemove}
          focusIndex={placementChanged ? null : focusIndex}
          showFocusRing={!placementChanged}
          overrideFields={meeting.override_fields}
          marksDisabled={cancelChecked}
          excludeRefForWeekly={(index) =>
            meetingRef
              ? weeklySlotExcludeRef(
                  {
                    courseIdx: meetingRef.courseIdx,
                    componentIdx: meetingRef.componentIdx,
                    seriesIdx: meetingRef.seriesIdx,
                    date: meeting.date,
                  },
                  index,
                )
              : null
          }
          excludeRefForOccurrence={(index) =>
            meetingRef
              ? occurrenceExcludeRef(
                  {
                    courseIdx: meetingRef.courseIdx,
                    componentIdx: meetingRef.componentIdx,
                    seriesIdx: meetingRef.seriesIdx,
                  },
                  index,
                )
              : null
          }
          newOccurrenceDefaults={{
            date: meeting.date,
            start_time:
              occurrences[focusIndex]?.start_time ?? occurrences[0]?.start_time,
            end_time:
              occurrences[focusIndex]?.end_time ?? occurrences[0]?.end_time,
            room: occurrences[focusIndex]?.room ?? occurrences[0]?.room ?? null,
            instructor:
              occurrences[focusIndex]?.instructor ??
              occurrences[0]?.instructor ??
              null,
          }}
          newWeeklyDefaults={{
            weekday:
              weeklySlots[focusIndex]?.weekday ??
              weeklySlots[0]?.weekday ??
              termWeekdayKeyToWeekday(originals.weekday),
            start_time:
              weeklySlots[focusIndex]?.start_time ?? weeklySlots[0]?.start_time,
            end_time:
              weeklySlots[focusIndex]?.end_time ?? weeklySlots[0]?.end_time,
            room: weeklySlots[focusIndex]?.room ?? weeklySlots[0]?.room ?? null,
            instructor:
              weeklySlots[focusIndex]?.instructor ??
              weeklySlots[0]?.instructor ??
              null,
          }}
          disabled={cancelChecked}
        />

        {perGroup ? (
          <EditClassPerGroupModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            value={audienceValue[0] || ""}
            options={perGroupOptions}
            onSave={(group) => setAudienceValue(group ? [group] : [])}
          />
        ) : (
          <EditClassAudienceModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            config={config}
            tokens={audienceValue}
            originalTokens={originals.audience}
            originalLabel={originalAudienceLabel}
            onSave={setAudienceValue}
          />
        )}

        {placement === "weekly" ? (
          <div
            className={clsx(
              "flex flex-col gap-1",
              cancelChecked && "border-error/60 border-l-4 pl-2",
            )}
          >
            <label className="label cursor-pointer justify-start gap-2 px-0 py-0">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-error"
                checked={cancelChecked}
                onChange={(event) => setCancelChecked(event.target.checked)}
              />
              <span className="text-sm font-medium">Отменить занятие</span>
            </label>
            {cancelChecked ? (
              <div className="text-base-content/55 text-xs">
                Занятие будет отменено для выбранного диапазона.
              </div>
            ) : null}
          </div>
        ) : null}

        {showApplyScope ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Применить к</span>
            <div className="flex flex-col gap-1">
              {SCOPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="label cursor-pointer justify-start gap-2 rounded-lg border border-transparent px-1 py-0.5"
                >
                  <input
                    type="radio"
                    name="edit-class-scope"
                    className="radio radio-sm"
                    checked={scope === option.value}
                    onChange={() => setScope(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : weeklyStructural ? (
          <div className="text-base-content/60 text-xs">
            Добавление, удаление или правка других слотов сохраняет всю серию
            целиком (без «Применить к»).
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-end gap-3">
          {scheduleChanged ? (
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content/80 text-sm"
              disabled={isPending}
              onClick={restoreScheduleOriginals}
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
            Закрыть
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending || !canSave}
            onClick={handleSubmit}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
