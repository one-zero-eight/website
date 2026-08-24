import type {
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
import {
  applyEditableEventsToCourse,
  createOccurrenceEvent,
  editableEventsToDraftMeetings,
  eventsEqual,
  expandOccurrencesToEvents,
  expandWeeklySlotsToEvents,
  initialSelectedEventKey,
  validateEditableEvents,
  type EditableSessionEvent,
} from "./editableSessionEvents.ts";
import { EditableSessionEventsEditor } from "./EditableSessionEventsEditor.tsx";
import {
  formatAudienceTokensLabel,
  isMeetingAudienceOverridden,
  meetingAudienceEqual,
  meetingEditOriginalValues,
  meetingInstructorsLabel,
  parseMeetingInstanceId,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
} from "./meetingEditUtils.ts";
import { MeetingOverrideIndicator } from "./meetingOverrideIndicator.tsx";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";
import { audienceSummaryHintProps } from "./audienceSummaryHints.ts";
import { toApiTime, weekdayToKey } from "./sessionSeriesRows.tsx";
import {
  SessionPlacementToggle,
  type SessionPlacement,
} from "./SessionSeriesEditor.tsx";
import { dayKey, type Meeting } from "./timetableViewerModel.ts";
import { formatDisplayDate } from "./timetableViewerModel.ts";

function cloneWeeklySlots(
  items: SchemaWeeklyPatternSlot[] | null | undefined,
): SchemaWeeklyPatternSlot[] {
  return structuredClone(items ?? []);
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
  const { showError } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [events, setEvents] = useState<EditableSessionEvent[]>([]);
  const [originalEvents, setOriginalEvents] = useState<EditableSessionEvent[]>(
    [],
  );
  const [weeklySlots, setWeeklySlots] = useState<SchemaWeeklyPatternSlot[]>([]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [placement, setPlacement] = useState<SessionPlacement>("weekly");

  const meetingRef = useMemo(
    () => (meeting ? parseMeetingInstanceId(meeting.instance_id) : null),
    [meeting],
  );

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

    const stripped = meetings.filter((item) => {
      const ref = parseMeetingInstanceId(item.instance_id);
      return !sameSeries(ref);
    });

    const drafts = editableEventsToDraftMeetings({
      events,
      meeting,
      meetingRef,
      audienceTokens: audienceValue,
    });
    return [...stripped, ...drafts];
  }, [audienceValue, events, meeting, meetingRef, meetings]);

  const conflictMeetingIndex = useMemo(
    () => buildMeetingPickerIndex(conflictMeetings),
    [conflictMeetings],
  );

  useEffect(() => {
    if (open) setDismissed(false);
  }, [open]);

  useEffect(() => {
    if (!open || !meeting || !originals || !meetingRef) return;

    const audience = minimizeAudienceTokens(
      [...originals.audience],
      buildAudienceSelectorTree(config, {
        sectionCode: meeting.section,
      }),
    );
    setAudienceValue(audience);

    const initialPlacement: SessionPlacement =
      meetingRef.kind === "occ" ? "dates_pattern" : "weekly";
    setPlacement(initialPlacement);

    if (initialPlacement === "dates_pattern") {
      const fromSeries = meetingSeries?.dates_pattern ?? [];
      const expanded =
        fromSeries.length > 0
          ? expandOccurrencesToEvents(fromSeries)
          : [
              createOccurrenceEvent({
                date: originals.date,
                start_time: toApiTime(originals.time || "09:00"),
                end_time: toApiTime(
                  originals.endTime ||
                    resolveEndTimeForStart(
                      config,
                      originals.time || "09:00",
                      audience,
                    ).slice(0, 5),
                ),
                room: originals.room || null,
                instructor: originals.instructor || null,
              }),
            ];
      setWeeklySlots([]);
      setEvents(expanded);
      setOriginalEvents(structuredClone(expanded));
      setFocusKey(initialSelectedEventKey(meeting, expanded));
      return;
    }

    const fromSeries = cloneWeeklySlots(meetingSeries?.weekly_pattern);
    const slots =
      fromSeries.length > 0
        ? fromSeries
        : [
            {
              weekday: termWeekdayKeyToWeekday(originals.weekday),
              start_time: toApiTime(originals.time || "09:00"),
              end_time: toApiTime(
                originals.endTime ||
                  resolveEndTimeForStart(
                    config,
                    originals.time || "09:00",
                    audience,
                  ).slice(0, 5),
              ),
              room: originals.room || null,
              instructor: originals.instructor || null,
              edits: null,
            },
          ];
    const expanded = expandWeeklySlotsToEvents({
      config,
      weeklySlots: slots,
      audienceTokens: audience,
    });
    setWeeklySlots(slots);
    setEvents(expanded);
    setOriginalEvents(structuredClone(expanded));
    setFocusKey(initialSelectedEventKey(meeting, expanded));
  }, [config, meeting, meetingRef, meetingSeries, open, originals]);

  function handlePlacementChange(next: SessionPlacement) {
    if (next === placement) return;

    if (next === "dates_pattern") {
      const occurrences: SchemaSessionOccurrence[] = events
        .filter((event) => !event.cancelled)
        .map((event) => ({
          date: event.date,
          start_time: event.start_time,
          end_time: event.end_time,
          room: event.room,
          instructor: event.instructor,
        }));
      const nextEvents = expandOccurrencesToEvents(occurrences);
      setWeeklySlots([]);
      setEvents(nextEvents);
      setFocusKey(initialSelectedEventKey(meeting, nextEvents));
      setPlacement(next);
      return;
    }

    const slots = new Map<string, SchemaWeeklyPatternSlot>();
    for (const event of events) {
      if (event.cancelled || !event.date) continue;
      const weekday = weekdayToKey(dayKey(event.date));
      const key = [
        weekday,
        event.start_time,
        event.end_time,
        event.room || "",
        event.instructor || "",
      ].join("\0");
      if (slots.has(key)) continue;
      slots.set(key, {
        weekday: termWeekdayKeyToWeekday(weekday),
        start_time: event.start_time,
        end_time: event.end_time,
        room: event.room,
        instructor: event.instructor,
        edits: null,
      });
    }
    const nextSlots = [...slots.values()];
    const nextEvents = expandWeeklySlotsToEvents({
      config,
      weeklySlots: nextSlots,
      audienceTokens: audienceValue,
    });
    setWeeklySlots(nextSlots);
    setEvents(nextEvents);
    setFocusKey(initialSelectedEventKey(meeting, nextEvents));
    setPlacement(next);
  }

  function handleClose() {
    if (isPending) return;
    setAudienceModalOpen(false);
    setDismissed(true);
    onOpenChange(false);
  }

  function closeAfterSave() {
    setAudienceModalOpen(false);
    setDismissed(true);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (isPending) return;
    if (!meeting || !meetingRef || !courses || !originals) return;
    const course = courses.find((item) => item.name === meeting.course);
    if (!course) {
      showError("Ошибка", "Курс не найден в конфигурации.");
      return;
    }

    if (!audienceValue.length) {
      showError(
        "Ошибка",
        perGroup ? "Выберите группу." : "Укажите хотя бы одну группу.",
      );
      return;
    }

    const seriesError = validateEditableEvents(events);
    if (seriesError) {
      showError("Ошибка", seriesError);
      return;
    }

    const audienceChanged = !meetingAudienceEqual(
      audienceValue,
      originals.audience,
    );
    const scheduleDirty = !eventsEqual(events, originalEvents);

    if (!audienceChanged && !scheduleDirty) {
      showError("Ошибка", "Нет изменений для сохранения.");
      return;
    }

    const updatedCourse = applyEditableEventsToCourse({
      course,
      meetingRef,
      config,
      audience: audienceChanged ? audienceValue : undefined,
      placement,
      weeklySlots,
      events,
    });

    if (!updatedCourse) {
      showError("Ошибка", "Не удалось применить изменение к занятию.");
      return;
    }

    mutate(
      {
        params: { path: { course_name: course.name } },
        body: updatedCourse,
      },
      { onSuccess: closeAfterSave },
    );
  }

  if (!meeting || !originals) return null;

  const instructorsLabel = meetingInstructorsLabel(meeting.instructors);
  const title = `${meeting.course} (${meeting.tag})`;
  const audienceChanged = !meetingAudienceEqual(
    audienceValue,
    originals.audience,
  );
  const originalAudienceLabel = formatAudienceTokensLabel(
    config,
    originals.audience,
  );
  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);
  const scheduleChanged = !eventsEqual(events, originalEvents);
  const canSave = audienceChanged || scheduleChanged;
  const groupsOverridden = isMeetingAudienceOverridden(
    config,
    meetingComponent,
    meetingSeries,
  );
  const componentAudienceLabel = meetingComponent
    ? formatAudienceTokensLabel(config, meetingComponent.audience || [])
    : "";

  function restoreScheduleOriginals() {
    setEvents(structuredClone(originalEvents));
  }

  return (
    <Modal
      open={open && !dismissed}
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

        <EditableSessionEventsEditor
          config={config}
          meetings={conflictMeetings}
          meetingIndex={conflictMeetingIndex}
          events={events}
          onEventsChange={setEvents}
          originalEvents={originalEvents}
          audienceTokens={audienceValue}
          courseInstructors={courseInstructors}
          instructorPool={meetingComponent?.instructor_pool}
          meetingRef={meetingRef}
          focusKey={focusKey}
          allowAddOccurrence={placement === "dates_pattern"}
          afterHeader={
            <div className="flex flex-wrap items-center gap-2">
              <EditClassAudienceSummaryRow
                config={config}
                tokens={audienceValue}
                displayLabel={audienceDisplayLabel}
                changed={audienceChanged}
                originalLabel={originalAudienceLabel}
                onRestoreOriginal={() =>
                  setAudienceValue(
                    minimizeAudienceTokens(
                      [...originals.audience],
                      buildAudienceSelectorTree(config, {
                        sectionCode: meeting.section,
                      }),
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
              <SessionPlacementToggle
                placement={placement}
                onChange={handlePlacementChange}
              />
            </div>
          }
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
            sectionCode={meeting.section}
          />
        )}

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
            className="btn btn-primary relative"
            disabled={isPending || !canSave}
            onClick={handleSubmit}
          >
            <span className={clsx(isPending && "invisible")}>Сохранить</span>
            {isPending ? (
              <span className="loading loading-spinner loading-sm absolute inset-0 m-auto" />
            ) : null}
          </button>
        </div>
      </div>
    </Modal>
  );
}
