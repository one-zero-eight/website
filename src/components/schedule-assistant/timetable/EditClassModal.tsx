import type {
  SchemaScheduleConfig,
  SchemaSessionActiveWindow,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { meetingCourseTitle } from "./localizedNames.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import { Trans, useLingui } from "@lingui/react/macro";
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
  serializeOccurrenceEvents,
  createOccurrenceEvent,
  editableEventsToDraftMeetings,
  eventsEqual,
  eventSchedulesEqual,
  eventsToOccurrences,
  eventsToWeeklySlots,
  serializeWeeklyEventsToSlots,
  weeklyConversionWarning,
  expandOccurrencesToEvents,
  expandWeeklySlotsPreservingEventOverrides,
  expandWeeklySlotsToEvents,
  initialSelectedEventKey,
  validateEditableEvents,
  type EditableSessionEvent,
} from "./editableSessionEvents.ts";
import { resolveSessionWindow, sessionWindowRange } from "./sessionWindows.ts";
import { EditableSessionEventsEditor } from "./EditableSessionEventsEditor.tsx";
import {
  formatAudienceTokensLabel,
  isMeetingAudienceOverridden,
  meetingAudienceEqual,
  meetingEditOriginalValues,
  parseMeetingInstanceId,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
  sessionActiveEqual,
  applySeriesScheduleToCourse,
} from "./meetingEditUtils.ts";
import { MeetingInstanceMetadata } from "./MeetingInstanceMetadata.tsx";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "./meetingPickerIndex.ts";
import { audienceSummaryHintProps } from "./audienceSummaryHints.ts";
import { toApiTime } from "./sessionSeriesRows.tsx";
import {
  SessionPlacementToggle,
  SessionSeriesEditor,
  type SessionPlacement,
} from "./SessionSeriesEditor.tsx";
import { type Meeting } from "./timetableViewerModel.ts";
import { normalizeWeeklySlot } from "./sessionRowMarks.ts";
import { weeklySlotExcludeRef } from "./meetingEditUtils.ts";

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
  const { t } = useLingui();
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [storedActive, setActive] = useState<SchemaSessionActiveWindow | null>(
    null,
  );
  const resolvedWindow = useMemo(
    () => sessionWindowRange(config, storedActive),
    [config, storedActive],
  );
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [events, setEvents] = useState<EditableSessionEvent[]>([]);
  const [originalEvents, setOriginalEvents] = useState<EditableSessionEvent[]>(
    [],
  );
  const [weeklySlots, setWeeklySlots] = useState<SchemaWeeklyPatternSlot[]>([]);
  const [originalWeeklySlots, setOriginalWeeklySlots] = useState<
    SchemaWeeklyPatternSlot[]
  >([]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [placement, setPlacement] = useState<SessionPlacement>("weekly");

  const meetingRef = useMemo(
    () => (meeting ? parseMeetingInstanceId(meeting.instance_id) : null),
    [meeting],
  );

  const meetingCourse = useMemo(() => {
    if (!meeting || !courses) return null;
    return courses.find((item) => item.name === meeting.course) ?? null;
  }, [courses, meeting]);

  const meetingComponent = useMemo(() => {
    if (!meetingCourse || !meetingRef) return null;
    return meetingCourse.components?.[meetingRef.componentIdx] ?? null;
  }, [meetingCourse, meetingRef]);

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
      courseNotes: meetingCourse?.notes ?? "",
    });
    return [...stripped, ...drafts];
  }, [audienceValue, events, meeting, meetingCourse, meetingRef, meetings]);

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
    setActive(meetingSeries?.active ?? null);

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
      setOriginalWeeklySlots([]);
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
      active: meetingSeries?.active,
    });
    setWeeklySlots(slots);
    setOriginalWeeklySlots(structuredClone(slots));
    setEvents(expanded);
    setOriginalEvents(structuredClone(expanded));
    setFocusKey(initialSelectedEventKey(meeting, expanded));
  }, [
    config,
    meeting,
    meetingCourse,
    meetingRef,
    meetingSeries,
    open,
    originals,
  ]);

  function handlePlacementChange(next: SessionPlacement) {
    if (next === placement) return;

    if (next === "dates_pattern") {
      const nextEvents = expandOccurrencesToEvents(eventsToOccurrences(events));
      setWeeklySlots(
        serializeWeeklyEventsToSlots({
          originalSlots: weeklySlots,
          events,
          config,
        }),
      );
      setEvents(nextEvents);
      setFocusKey(initialSelectedEventKey(meeting, nextEvents));
      setPlacement(next);
      return;
    }

    const cachedEvents = expandWeeklySlotsToEvents({
      config,
      weeklySlots,
      audienceTokens: audienceValue,
      active: storedActive,
    });
    const nextSlots =
      weeklySlots.length && eventSchedulesEqual(events, cachedEvents)
        ? serializeWeeklyEventsToSlots({
            originalSlots: weeklySlots,
            events: cachedEvents,
            config,
          })
        : eventsToWeeklySlots(events);
    const nextEvents = expandWeeklySlotsToEvents({
      config,
      weeklySlots: nextSlots,
      audienceTokens: audienceValue,
      active: storedActive,
    });
    if (
      !eventSchedulesEqual(events, nextEvents) &&
      !window.confirm(weeklyConversionWarning())
    )
      return;
    setWeeklySlots(nextSlots);
    setEvents(nextEvents);
    setFocusKey(initialSelectedEventKey(meeting, nextEvents));
    setPlacement(next);
  }

  const templateChanged =
    placement !== (meetingRef?.kind === "occ" ? "dates_pattern" : "weekly") ||
    (placement === "weekly" &&
      JSON.stringify(weeklySlots.map(normalizeWeeklySlot)) !==
        JSON.stringify(originalWeeklySlots.map(normalizeWeeklySlot)));
  const editableWeeklySlots = useMemo(
    () =>
      serializeWeeklyEventsToSlots({
        originalSlots: weeklySlots,
        events,
        config,
      }),
    [weeklySlots, events, config],
  );

  function handleWeeklySlotsChange(slots: SchemaWeeklyPatternSlot[]) {
    setWeeklySlots(slots);
    setEvents(
      expandWeeklySlotsPreservingEventOverrides({
        config,
        weeklySlots: slots,
        previousEvents: events,
        audienceTokens: audienceValue,
        active: storedActive,
      }),
    );
  }

  function handleSessionWindowChange(next: {
    active: SchemaSessionActiveWindow | null;
  }) {
    if (sessionActiveEqual(storedActive, next.active)) {
      return;
    }
    setActive(next.active);
    if (placement !== "weekly") return;
    // Avoid rewriting an untouched template during a window-only edit.
    const previousEvents = expandWeeklySlotsToEvents({
      config,
      weeklySlots,
      audienceTokens: audienceValue,
      active: storedActive,
    });
    const nextSlots = eventsEqual(events, previousEvents)
      ? weeklySlots
      : editableWeeklySlots;
    setWeeklySlots(nextSlots);
    setEvents(
      expandWeeklySlotsPreservingEventOverrides({
        config,
        weeklySlots: nextSlots,
        previousEvents: events,
        audienceTokens: audienceValue,
        active: next.active,
      }),
    );
  }

  function handleAudienceChange(audience: string[]) {
    setAudienceValue(audience);
    if (placement !== "weekly") return;
    setWeeklySlots(editableWeeklySlots);
    setEvents(
      expandWeeklySlotsPreservingEventOverrides({
        config,
        weeklySlots: editableWeeklySlots,
        previousEvents: events,
        audienceTokens: audience,
        active: storedActive,
      }),
    );
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
      showError(t`Error`, t`Course not found in the configuration.`);
      return;
    }

    if (!audienceValue.length) {
      showError(
        t`Error`,
        perGroup ? t`Select a group.` : t`Specify at least one group.`,
      );
      return;
    }

    const sessionWindow = resolveSessionWindow(
      config,
      audienceValue,
      storedActive,
    );
    const seriesError =
      sessionWindow &&
      placement === "weekly" &&
      weeklySlots.length > 0 &&
      events.length === 0
        ? null
        : validateEditableEvents(events, sessionWindow);
    if (seriesError) {
      showError(t`Error`, seriesError);
      return;
    }

    const audienceChanged = !meetingAudienceEqual(
      audienceValue,
      originals.audience,
    );
    const scheduleDirty =
      templateChanged || !eventsEqual(events, originalEvents);

    if (!audienceChanged && !scheduleDirty) {
      showError(t`Error`, t`No changes to save.`);
      return;
    }

    const placementChanged =
      placement !== (meetingRef.kind === "occ" ? "dates_pattern" : "weekly");
    const expectedEvents =
      placement === "weekly"
        ? expandWeeklySlotsToEvents({
            config,
            weeklySlots,
            audienceTokens: audienceValue,
            active: storedActive,
          })
        : originalEvents;
    const schedulePayloadChanged =
      templateChanged || !eventsEqual(events, expectedEvents);
    const updatedCourse = applySeriesScheduleToCourse(
      course,
      meetingRef,
      config,
      {
        audience: audienceChanged ? audienceValue : undefined,
        active: storedActive,
        weeklyPattern:
          placement === "weekly" && schedulePayloadChanged
            ? serializeWeeklyEventsToSlots({
                originalSlots: weeklySlots,
                events,
                config,
              })
            : placementChanged
              ? null
              : undefined,
        dates_pattern:
          placement === "dates_pattern" && schedulePayloadChanged
            ? serializeOccurrenceEvents(events)
            : placementChanged
              ? null
              : undefined,
      },
    );

    if (!updatedCourse) {
      showError(t`Error`, t`Failed to apply the change to the class.`);
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

  const meetingTitle = `${meetingCourseTitle(meeting)} (${meeting.tag})`;
  const audienceChanged = !meetingAudienceEqual(
    audienceValue,
    originals.audience,
  );
  const originalAudienceLabel = formatAudienceTokensLabel(
    config,
    originals.audience,
  );
  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);
  const scheduleChanged =
    templateChanged || !eventsEqual(events, originalEvents);
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
    setPlacement(meetingRef?.kind === "occ" ? "dates_pattern" : "weekly");
    setActive(meetingSeries?.active ?? null);
    setWeeklySlots(structuredClone(originalWeeklySlots));
    setEvents(
      meetingRef?.kind === "wp"
        ? expandWeeklySlotsToEvents({
            config,
            weeklySlots: originalWeeklySlots,
            audienceTokens: audienceValue,
            active: meetingSeries?.active,
          })
        : structuredClone(originalEvents),
    );
  }

  return (
    <Modal
      open={open && !dismissed}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title={
        <div className="min-w-0">
          <div>{meetingTitle}</div>
          <MeetingInstanceMetadata
            className="text-base-content/80 mt-1.5 font-normal"
            config={config}
            date={meeting.date}
            start={meeting.start}
            end={meeting.end}
            room={meeting.room}
            groups={meeting.groups}
            instructors={meeting.instructors}
            weekly={meetingRef?.kind === "wp"}
          />
        </div>
      }
      closeOnOutsidePress={!isPending && !audienceModalOpen}
      overlayClassName="!flex items-start justify-center overflow-hidden py-4"
      containerClassName="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
    >
      <div className="mt-3 flex flex-col gap-3">
        <details className="rounded-box border-base-300 border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            <Trans>Series template</Trans>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <EditClassAudienceSummaryRow
                config={config}
                tokens={audienceValue}
                displayLabel={audienceDisplayLabel}
                changed={audienceChanged}
                originalLabel={originalAudienceLabel}
                onRestoreOriginal={() =>
                  handleAudienceChange(
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
            {placement === "weekly" ? (
              <SessionSeriesEditor
                config={config}
                active={storedActive}
                originalActive={meetingSeries?.active}
                onSessionWindowChange={handleSessionWindowChange}
                meetings={meetings}
                meetingIndex={_meetingPickerIndex}
                placement={placement}
                onPlacementChange={handlePlacementChange}
                showPlacementToggle={false}
                weeklySlots={editableWeeklySlots}
                onWeeklySlotsChange={handleWeeklySlotsChange}
                originalWeeklySlots={originalWeeklySlots}
                occurrences={[]}
                onOccurrencesChange={(occurrences) =>
                  setEvents(expandOccurrencesToEvents(occurrences))
                }
                audienceTokens={audienceValue}
                courseInstructors={courseInstructors}
                instructorPool={meetingComponent?.instructor_pool}
                excludeRefForWeekly={(index) =>
                  meetingRef ? weeklySlotExcludeRef(meetingRef, index) : null
                }
              />
            ) : null}
          </div>
        </details>

        <EditableSessionEventsEditor
          config={config}
          active={resolvedWindow}
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
        />

        {perGroup ? (
          <EditClassPerGroupModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            value={audienceValue[0] || ""}
            options={perGroupOptions}
            onSave={(group) => handleAudienceChange(group ? [group] : [])}
          />
        ) : (
          <EditClassAudienceModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            config={config}
            tokens={audienceValue}
            originalTokens={originals.audience}
            originalLabel={originalAudienceLabel}
            onSave={handleAudienceChange}
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
              <Trans>Reset changes</Trans>
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={handleClose}
          >
            <Trans>Close</Trans>
          </button>
          <button
            type="button"
            className="btn btn-primary relative"
            disabled={isPending || !canSave}
            onClick={handleSubmit}
          >
            <span className={clsx(isPending && "invisible")}>
              <Trans>Save</Trans>
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
