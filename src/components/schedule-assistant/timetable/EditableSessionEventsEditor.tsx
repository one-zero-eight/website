import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { InstructorPicker } from "@/components/schedule-assistant/timetable/InstructorPicker.tsx";
import { DateInput } from "@/components/schedule-assistant/timetable/DateInput.tsx";
import {
  occurrenceExcludeRef,
  weeklySlotExcludeRef,
  type MeetingRef,
} from "@/components/schedule-assistant/timetable/meetingEditUtils.ts";
import type { MeetingPickerIndex } from "@/components/schedule-assistant/timetable/meetingPickerIndex.ts";
import {
  createOccurrenceEvent,
  editableSessionEventInstanceId,
  patchEditableEvents,
  type EditableSessionEvent,
  type EditableSessionEventPatch,
} from "@/components/schedule-assistant/timetable/editableSessionEvents.ts";
import {
  FieldMark,
  RoomSelect,
  SlotTimeFields,
  toUiTime,
  weekdayToKey,
  type SessionRowFieldMarks,
} from "@/components/schedule-assistant/timetable/sessionSeriesRows.tsx";
import {
  dayKey,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { SessionEventCard } from "@/components/schedule-assistant/timetable/SessionEventCard.tsx";
import { cn } from "@/lib/ui/cn";
import { SessionNotesOverrideField } from "./SessionSeriesEditor.tsx";
import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

function eventWeekdayKey(date: string, config: SchemaScheduleConfig) {
  if (date) return weekdayToKey(dayKey(date));
  return weekdayToKey(
    String(config.term.days?.[0] || "monday").toLowerCase() || "monday",
  );
}

function isBulkFieldPatch(patch: EditableSessionEventPatch) {
  return (
    patch.start_time !== undefined ||
    patch.end_time !== undefined ||
    patch.room !== undefined ||
    patch.instructor !== undefined ||
    patch.notes !== undefined
  );
}

function SelectionBar({
  selectedCount,
  onToggleAll,
  onSelectFollowing,
}: {
  selectedCount: number;
  onToggleAll: () => void;
  onSelectFollowing: (() => void) | undefined;
}) {
  return (
    <div className="flex min-h-5 items-center gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          className="text-base-content/70 hover:text-base-content cursor-pointer text-sm hover:underline"
          onClick={onToggleAll}
        >
          {selectedCount > 0 ? "Снять выбор" : "Выбрать все"}
        </button>
        {onSelectFollowing ? (
          <button
            type="button"
            className="text-base-content/70 hover:text-base-content cursor-pointer text-sm hover:underline"
            onClick={onSelectFollowing}
          >
            Выбрать это и все последующие
          </button>
        ) : null}
      </div>
      {selectedCount > 0 ? (
        <span className="text-base-content/70 ml-auto shrink-0 text-sm">
          Выбрано: {selectedCount}
        </span>
      ) : null}
    </div>
  );
}

function fieldMarksForEvent(
  event: EditableSessionEvent,
  original: EditableSessionEvent | undefined,
  onRestore: (key: string, patch: EditableSessionEventPatch) => void,
): SessionRowFieldMarks | undefined {
  if (!original || event.cancelled) return undefined;
  const marks: SessionRowFieldMarks = {};
  if (event.date !== original.date) {
    marks.date = {
      mark: "changed",
      originalLabel: original.date,
      onRestore: () => onRestore(event.key, { date: original.date }),
    };
  }
  if (
    toUiTime(event.start_time) !== toUiTime(original.start_time) ||
    toUiTime(event.end_time) !== toUiTime(original.end_time)
  ) {
    marks.time = {
      mark: "changed",
      originalLabel: `${toUiTime(original.start_time)}–${toUiTime(original.end_time)}`,
      onRestore: () =>
        onRestore(event.key, {
          start_time: original.start_time,
          end_time: original.end_time,
        }),
    };
  }
  if (String(event.room || "") !== String(original.room || "")) {
    marks.room = {
      mark: "changed",
      originalLabel: String(original.room || "—"),
      onRestore: () => onRestore(event.key, { room: original.room }),
    };
  }
  if (String(event.instructor || "") !== String(original.instructor || "")) {
    marks.instructor = {
      mark: "changed",
      originalLabel: String(original.instructor || "—"),
      onRestore: () =>
        onRestore(event.key, { instructor: original.instructor }),
    };
  }
  return Object.keys(marks).length ? marks : undefined;
}

/**
 * Memoized row content. Selected rows share the same bulk picker scope;
 * unselected rows keep their individual availability checks.
 */
const ConcreteEventRowFields = memo(function ConcreteEventRowFields({
  event,
  original,
  config,
  meetings,
  meetingIndex,
  audienceTokens,
  seriesNotes,
  courseInstructors,
  instructorPool,
  meetingRef,
  onChange,
  onRestore,
  onRemoveOrRestore,
  excludeInstanceId,
  pickerSelection,
  selected,
  onToggleSelected,
}: {
  selected: boolean;
  onToggleSelected: (key: string) => void;
  event: EditableSessionEvent;
  original: EditableSessionEvent | undefined;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  audienceTokens: string[];
  seriesNotes?: string;
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  meetingRef: MeetingRef | null;
  onChange: (key: string, patch: EditableSessionEventPatch) => void;
  onRestore: (key: string, patch: EditableSessionEventPatch) => void;
  onRemoveOrRestore: (key: string) => void;
  excludeInstanceId: string | null;
  pickerSelection?: Meeting[];
}) {
  const cancelled = event.cancelled;
  const weekday = eventWeekdayKey(event.date, config);
  const start = toUiTime(event.start_time);
  const end = toUiTime(event.end_time);
  const fieldMarks = fieldMarksForEvent(event, original, onRestore);
  const base =
    event.source.kind === "weekly" && !cancelled ? event.weeklyBase : undefined;
  const overriddenWeekday =
    !!base && !!event.date && dayKey(event.date) !== dayKey(base.date);
  const overriddenTime =
    !!base &&
    (start !== toUiTime(base.start_time) || end !== toUiTime(base.end_time));
  const overriddenRoom =
    !!base && String(event.room || "") !== String(base.room || "");
  const overriddenInstructor =
    !!base && String(event.instructor || "") !== String(base.instructor || "");
  const excludeRef = useMemo(
    () =>
      event.source.kind === "weekly" && meetingRef
        ? weeklySlotExcludeRef(
            {
              courseIdx: meetingRef.courseIdx,
              componentIdx: meetingRef.componentIdx,
              seriesIdx: meetingRef.seriesIdx,
              date: event.source.patternDate,
            },
            event.source.slotIdx,
          )
        : event.source.kind === "occurrence" &&
            meetingRef &&
            event.source.occIdx != null
          ? occurrenceExcludeRef(
              {
                courseIdx: meetingRef.courseIdx,
                componentIdx: meetingRef.componentIdx,
                seriesIdx: meetingRef.seriesIdx,
              },
              event.source.occIdx,
            )
          : null,
    [event.source, meetingRef],
  );

  return (
    <div className="relative grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
      <div className="flex items-start gap-2 sm:col-span-2">
        <label className="bg-base-200 absolute -top-4 -left-4 flex size-5 cursor-pointer items-center justify-center rounded-full">
          <input
            type="checkbox"
            className="checkbox checkbox-sm not-checked:border-base-content/20 not-checked:hover:border-base-content/40 transition-colors"
            checked={selected}
            onChange={() => onToggleSelected(event.key)}
          />
        </label>
        <div
          className={cn(
            "grid min-w-0 flex-1 gap-2 sm:grid-cols-2",
            cancelled && "pointer-events-none line-through opacity-60",
          )}
        >
          <FieldMark
            reserveGutter={false}
            hint={cancelled ? undefined : fieldMarks?.date}
          >
            <DateInput
              value={event.date || ""}
              showWeekday
              weekdayOverridden={overriddenWeekday}
              onChange={(date) => onChange(event.key, { date })}
            />
          </FieldMark>
          <FieldMark
            reserveGutter={false}
            hint={cancelled ? undefined : fieldMarks?.time}
            overridden={overriddenTime}
          >
            <SlotTimeFields
              config={config}
              startTime={event.start_time}
              endTime={event.end_time}
              audienceTokens={audienceTokens}
              onChange={(next) => onChange(event.key, next)}
            />
          </FieldMark>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          title={
            cancelled
              ? "Восстановить"
              : event.source.kind === "weekly"
                ? "Отменить занятие"
                : "Удалить дату"
          }
          onClick={(clickEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            onRemoveOrRestore(event.key);
          }}
        >
          <span
            className={
              cancelled
                ? "icon-[material-symbols--undo-rounded] text-base"
                : "icon-[material-symbols--delete-outline-rounded] text-base"
            }
          />
        </button>
      </div>
      <div
        className={cn(
          "sm:col-span-2",
          cancelled && "pointer-events-none opacity-60",
        )}
      >
        <FieldMark
          reserveGutter={false}
          hint={cancelled ? undefined : fieldMarks?.room}
          overridden={overriddenRoom}
        >
          <RoomSelect
            config={config}
            meetings={meetings}
            meetingIndex={meetingIndex}
            value={String(event.room || "")}
            weekday={weekday}
            date={event.date || undefined}
            start={start}
            end={end}
            audienceTokens={audienceTokens}
            excludeRef={excludeInstanceId ? undefined : excludeRef}
            excludeInstanceId={excludeInstanceId}
            pickerSelection={pickerSelection}
            onChange={(room) => onChange(event.key, { room: room || null })}
          />
        </FieldMark>
      </div>
      <div
        className={cn(
          "sm:col-span-2",
          cancelled && "pointer-events-none opacity-60",
        )}
      >
        <FieldMark
          reserveGutter={false}
          hint={cancelled ? undefined : fieldMarks?.instructor}
          overridden={overriddenInstructor}
        >
          <InstructorPicker
            config={config}
            meetings={meetings}
            meetingIndex={meetingIndex}
            value={event.instructor || ""}
            weekday={weekday}
            date={event.date || undefined}
            start={start}
            end={end}
            courseInstructors={courseInstructors}
            instructorPool={instructorPool}
            excludeRef={excludeInstanceId ? undefined : excludeRef}
            excludeInstanceId={excludeInstanceId}
            pickerSelection={pickerSelection}
            onChange={(instructor) =>
              onChange(event.key, { instructor: instructor || null })
            }
          />
        </FieldMark>
      </div>
      <div className="sm:col-span-2">
        <SessionNotesOverrideField
          notes={event.notes}
          seriesNotes={seriesNotes ?? ""}
          disabled={cancelled}
          onChange={(notes) => onChange(event.key, { notes })}
        />
      </div>
      {cancelled ? (
        <div className="text-error/80 text-xs sm:col-span-2">
          {event.source.kind === "weekly" ? "Отменено" : "Удалено"}
        </div>
      ) : null}
    </div>
  );
});

function ConcreteEventRow({
  event,
  original,
  config,
  meetings,
  meetingIndex,
  audienceTokens,
  seriesNotes,
  courseInstructors,
  instructorPool,
  meetingRef,
  excludeInstanceId,
  pickerSelection,
  selected,
  highlighted,
  onToggleSelected,
  onChange,
  onRestore,
  onRemoveOrRestore,
}: {
  event: EditableSessionEvent;
  original: EditableSessionEvent | undefined;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  audienceTokens: string[];
  seriesNotes?: string;
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  meetingRef: MeetingRef | null;
  excludeInstanceId: string | null;
  pickerSelection?: Meeting[];
  selected: boolean;
  highlighted: boolean;
  onToggleSelected: (key: string) => void;
  onChange: (key: string, patch: EditableSessionEventPatch) => void;
  onRestore: (key: string, patch: EditableSessionEventPatch) => void;
  onRemoveOrRestore: (key: string) => void;
}) {
  return (
    <div data-event-key={event.key}>
      <SessionEventCard
        deleted={event.cancelled}
        highlighted={highlighted}
        selected={selected}
      >
        <div className="flex items-start gap-2">
          <ConcreteEventRowFields
            selected={selected}
            onToggleSelected={onToggleSelected}
            event={event}
            original={original}
            config={config}
            meetings={meetings}
            meetingIndex={meetingIndex}
            audienceTokens={audienceTokens}
            seriesNotes={seriesNotes}
            courseInstructors={courseInstructors}
            instructorPool={instructorPool}
            meetingRef={meetingRef}
            excludeInstanceId={excludeInstanceId}
            pickerSelection={pickerSelection}
            onChange={onChange}
            onRestore={onRestore}
            onRemoveOrRestore={onRemoveOrRestore}
          />
        </div>
      </SessionEventCard>
    </div>
  );
}

export function EditableSessionEventsEditor({
  config,
  meetings,
  meetingIndex,
  events,
  onEventsChange,
  originalEvents,
  audienceTokens,
  seriesNotes,
  courseInstructors,
  instructorPool,
  meetingRef,
  focusKey,
  afterHeader,
  allowAddOccurrence = false,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  events: EditableSessionEvent[];
  onEventsChange: (next: EditableSessionEvent[]) => void;
  originalEvents: EditableSessionEvent[];
  audienceTokens: string[];
  seriesNotes?: string;
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  meetingRef: MeetingRef | null;
  focusKey: string | null;
  afterHeader?: ReactNode;
  allowAddOccurrence?: boolean;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const listRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const selectedKeysRef = useRef(selectedKeys);
  selectedKeysRef.current = selectedKeys;

  const originalByKey = useMemo(() => {
    const map = new Map<string, EditableSessionEvent>();
    for (const event of originalEvents) map.set(event.key, event);
    return map;
  }, [originalEvents]);

  useEffect(() => {
    if (!focusKey) return;
    const frame = requestAnimationFrame(() => {
      const node = listRef.current?.querySelector(
        `[data-event-key="${CSS.escape(focusKey)}"]`,
      );
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focusKey]);

  const pickerSelection = useMemo(() => {
    if (!meetingRef || selectedKeys.size < 2) return undefined;
    const ids = new Set(
      events
        .filter((event) => selectedKeys.has(event.key) && !event.cancelled)
        .map((event) => editableSessionEventInstanceId(event, meetingRef)),
    );
    const targets = meetings.filter(
      (meeting) => ids.has(meeting.instance_id) && !meeting.cancelled,
    );
    return targets.length > 1 ? targets : undefined;
  }, [events, meetingRef, meetings, selectedKeys]);

  const focusedEvent = events.find((event) => event.key === focusKey);
  function handleSelectFollowing() {
    if (!focusedEvent) return;
    const followingKeys = events
      .filter(
        (event) =>
          event.date > focusedEvent.date ||
          (event.date === focusedEvent.date &&
            toUiTime(event.start_time) >= toUiTime(focusedEvent.start_time)),
      )
      .map((event) => event.key);
    startTransition(() => setSelectedKeys(new Set(followingKeys)));
  }

  function handleToggleAll() {
    startTransition(() => {
      if (selectedKeys.size > 0) {
        setSelectedKeys(new Set());
        return;
      }
      setSelectedKeys(new Set(events.map((event) => event.key)));
    });
  }

  function handleToggleSelected(key: string) {
    startTransition(() => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    });
  }

  function handlePatchEvent(key: string, patch: EditableSessionEventPatch) {
    const currentEvents = eventsRef.current;
    const selected = selectedKeysRef.current;
    const shouldBulk =
      isBulkFieldPatch(patch) && selected.has(key) && selected.size > 1;
    const targets = shouldBulk ? selected : [key];
    onEventsChange(patchEditableEvents(currentEvents, targets, patch));
  }

  function handleRemoveOrRestore(key: string) {
    const currentEvents = eventsRef.current;
    const event = currentEvents.find((item) => item.key === key);
    if (!event) return;

    if (event.source.kind === "weekly") {
      onEventsChange(
        patchEditableEvents(currentEvents, [event.key], {
          cancelled: !event.cancelled,
        }),
      );
      return;
    }

    if (event.cancelled) {
      onEventsChange(
        patchEditableEvents(currentEvents, [event.key], { cancelled: false }),
      );
      return;
    }

    if (event.source.occIdx != null) {
      onEventsChange(
        patchEditableEvents(currentEvents, [event.key], { cancelled: true }),
      );
      return;
    }

    onEventsChange(currentEvents.filter((item) => item.key !== event.key));
    startTransition(() => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(event.key);
        return next;
      });
    });
  }

  const handlersRef = useRef({
    onChange: handlePatchEvent,
    onRestore: handlePatchEvent,
    onRemoveOrRestore: handleRemoveOrRestore,
    onToggleSelected: handleToggleSelected,
  });
  handlersRef.current = {
    onChange: handlePatchEvent,
    onRestore: handlePatchEvent,
    onRemoveOrRestore: handleRemoveOrRestore,
    onToggleSelected: handleToggleSelected,
  };

  const stableOnChange = useMemo(
    () => (key: string, patch: EditableSessionEventPatch) =>
      handlersRef.current.onChange(key, patch),
    [],
  );
  const stableOnRestore = useMemo(
    () => (key: string, patch: EditableSessionEventPatch) =>
      handlersRef.current.onRestore(key, patch),
    [],
  );
  const stableOnRemoveOrRestore = useMemo(
    () => (key: string) => handlersRef.current.onRemoveOrRestore(key),
    [],
  );
  const stableOnToggleSelected = useMemo(
    () => (key: string) => handlersRef.current.onToggleSelected(key),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      {afterHeader}
      <SelectionBar
        selectedCount={selectedKeys.size}
        onToggleAll={handleToggleAll}
        onSelectFollowing={focusedEvent ? handleSelectFollowing : undefined}
      />
      <div ref={listRef} className="flex flex-col gap-2">
        {events.map((event) => (
          <ConcreteEventRow
            key={event.key}
            event={event}
            original={originalByKey.get(event.key)}
            config={config}
            meetings={meetings}
            meetingIndex={meetingIndex}
            audienceTokens={audienceTokens}
            seriesNotes={seriesNotes}
            courseInstructors={courseInstructors}
            instructorPool={instructorPool}
            meetingRef={meetingRef}
            excludeInstanceId={
              meetingRef && !event.cancelled
                ? editableSessionEventInstanceId(event, meetingRef)
                : null
            }
            pickerSelection={
              selectedKeys.has(event.key) ? pickerSelection : undefined
            }
            selected={selectedKeys.has(event.key)}
            highlighted={focusKey === event.key}
            onToggleSelected={stableOnToggleSelected}
            onChange={stableOnChange}
            onRestore={stableOnRestore}
            onRemoveOrRestore={stableOnRemoveOrRestore}
          />
        ))}
      </div>
      {allowAddOccurrence ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          onClick={() => {
            const template =
              events.find((item) => !item.cancelled) ?? events[0];
            onEventsChange([
              ...events,
              createOccurrenceEvent({
                date: template?.date,
                start_time: template?.start_time,
                end_time: template?.end_time,
                room: template?.room ?? null,
                instructor: template?.instructor ?? null,
              }),
            ]);
          }}
        >
          <span className="icon-[material-symbols--add-rounded] text-base" />
          Добавить дату
        </button>
      ) : null}
    </div>
  );
}
