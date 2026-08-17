import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import {
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { InstructorPicker } from "@/components/schedule-assistant/timetable/InstructorPicker.tsx";
import { DateInput } from "@/components/schedule-assistant/timetable/DateInput.tsx";
import {
  CUSTOM_TIME_OPTION_VALUE,
  customTimeOptionLabel,
  normalizeTypedHhmm,
  parseLooseTimeToken,
  parseTimeRangeQuery,
  resolveEndTimeForStart,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
  type MeetingRef,
} from "@/components/schedule-assistant/timetable/meetingEditUtils.ts";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "@/components/schedule-assistant/timetable/meetingPickerIndex.ts";
import {
  buildRoomPickerOptions,
  roomPickerDatesForEdit,
} from "@/components/schedule-assistant/timetable/roomPickerOptions.ts";
import {
  dayKey,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { instructorValue } from "@/components/schedule-assistant/timetable/sessionSeriesValidation.ts";
import { cn } from "@/lib/ui/cn";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type SessionRowFieldMark = "changed" | "overridden";

export type SessionRowFieldHint = {
  mark?: SessionRowFieldMark;
  originalLabel?: string;
  onRestore?: () => void;
};

export type SessionRowFieldMarks = {
  date?: SessionRowFieldHint;
  weekday?: SessionRowFieldHint;
  time?: SessionRowFieldHint;
  room?: SessionRowFieldHint;
  instructor?: SessionRowFieldHint;
};

function FieldMark({
  hint,
  children,
}: {
  hint?: SessionRowFieldHint;
  children: ReactNode;
}) {
  const mark = hint?.mark;

  // Always wrap + always reserve the left gutter so toggles never remount
  // children or shift layout (which steals focus from date/select inputs).
  return (
    <div
      className={cn(
        "border-l-4 pl-2",
        mark === "changed" && "border-warning/60",
        mark === "overridden" && "border-info/60",
        !mark && "border-transparent",
      )}
    >
      {children}
      {mark === "changed" && hint?.originalLabel != null && hint.onRestore ? (
        <div className="text-base-content/55 mt-1 text-xs">
          Было:{" "}
          <button
            type="button"
            className="hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={hint.onRestore}
          >
            {hint.originalLabel || "—"}
          </button>
        </div>
      ) : mark === "overridden" ? (
        <div className="text-info/80 mt-1 text-xs">
          переопределено в шаблоне
        </div>
      ) : null}
    </div>
  );
}

export function toApiTime(value: string): string {
  const hhmm = normalizeTypedHhmm(value).slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return value;
}

export function toUiTime(value: string | null | undefined): string {
  return String(value || "").slice(0, 5);
}

export function weekdayToKey(weekday: string): TermWeekdayKey {
  const lowered = String(weekday || "")
    .trim()
    .toLowerCase();
  const map: Record<string, TermWeekdayKey> = {
    monday: "Mon",
    mon: "Mon",
    tuesday: "Tue",
    tue: "Tue",
    wednesday: "Wed",
    wed: "Wed",
    thursday: "Thu",
    thu: "Thu",
    friday: "Fri",
    fri: "Fri",
    saturday: "Sat",
    sat: "Sat",
    sunday: "Sun",
    sun: "Sun",
  };
  return map[lowered] ?? "Mon";
}

export function SlotTimeFields({
  config,
  startTime,
  endTime,
  audienceTokens,
  onChange,
}: {
  config: SchemaScheduleConfig;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  /** Selected groups — drives program timeslots when the program defines them. */
  audienceTokens?: string[];
  onChange: (next: { start_time: string; end_time: string }) => void;
}) {
  const timeOptions = timeOptionsForConfig(config, audienceTokens);
  const start = toUiTime(startTime);
  const end = toUiTime(endTime);
  const isPreset = timeOptions.some(
    (slot) => slot.value === start && (!end || slot.end === end),
  );
  const [forceCustom, setForceCustom] = useState(
    () => Boolean(start) && !isPreset,
  );
  // Local drafts so partial edits (e.g. replacing "18" with "19") are not
  // padded to "01:00" on every keystroke via toApiTime/normalizeTypedHhmm.
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  // Stay in custom mode until the user picks a preset from the dropdown,
  // so typing toward a matching start/end does not remount the inputs.
  useEffect(() => {
    if (start && !isPreset) setForceCustom(true);
  }, [start, isPreset]);
  useEffect(() => {
    setDraftStart(null);
    setDraftEnd(null);
    setStartError("");
    setEndError("");
  }, [startTime, endTime]);
  const useCustomTime = forceCustom || (Boolean(start) && !isPreset);
  const displayStart = draftStart ?? start;
  const displayEnd = draftEnd ?? end;

  function commitTimes(nextStart: string, nextEnd: string): boolean {
    const startRaw = String(nextStart || "").trim();
    const endRaw = String(nextEnd || "").trim();
    const parsedStart = startRaw ? parseLooseTimeToken(startRaw) : undefined;
    const parsedEnd = endRaw ? parseLooseTimeToken(endRaw) : undefined;

    const nextStartError = !startRaw
      ? "Укажите время"
      : parsedStart
        ? ""
        : "Некорректное время";
    const nextEndError = !endRaw
      ? "Укажите время"
      : parsedEnd
        ? ""
        : "Некорректное время";

    if (nextStartError || nextEndError) {
      setDraftStart(startRaw);
      setDraftEnd(endRaw);
      setStartError(nextStartError);
      setEndError(nextEndError);
      return false;
    }

    setDraftStart(null);
    setDraftEnd(null);
    setStartError("");
    setEndError("");
    onChange({
      start_time: toApiTime(parsedStart!),
      end_time: toApiTime(parsedEnd!),
    });
    return true;
  }

  function handleStartKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const ok = commitTimes(displayStart, displayEnd);
    if (!ok) {
      const startRaw = String(displayStart || "").trim();
      if (!startRaw || !parseLooseTimeToken(startRaw)) {
        event.currentTarget.select();
        return;
      }
      endInputRef.current?.focus();
      endInputRef.current?.select();
      return;
    }
    endInputRef.current?.focus();
    endInputRef.current?.select();
  }

  function handleEndKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!commitTimes(displayStart, displayEnd)) {
      const endRaw = String(displayEnd || "").trim();
      if (!endRaw || !parseLooseTimeToken(endRaw)) {
        event.currentTarget.select();
        return;
      }
      startInputRef.current?.focus();
      startInputRef.current?.select();
      return;
    }
    event.currentTarget.blur();
  }

  return (
    <div className="flex flex-col gap-2">
      <SelectDropdown
        value={useCustomTime ? CUSTOM_TIME_OPTION_VALUE : start}
        onChange={(value, context) => {
          setDraftStart(null);
          setDraftEnd(null);
          setStartError("");
          setEndError("");
          if (value === CUSTOM_TIME_OPTION_VALUE) {
            setForceCustom(true);
            const parsed = parseTimeRangeQuery(context?.searchQuery ?? "");
            onChange({
              start_time: toApiTime(parsed.start || start || "09:00"),
              end_time: toApiTime(
                parsed.end ||
                  end ||
                  resolveEndTimeForStart(
                    config,
                    parsed.start || start,
                    audienceTokens,
                  ),
              ),
            });
            return;
          }
          setForceCustom(false);
          const next = timeOptions.find((slot) => slot.value === value);
          onChange({
            start_time: toApiTime(value),
            end_time: toApiTime(
              next?.end ||
                resolveEndTimeForStart(config, value, audienceTokens),
            ),
          });
        }}
        options={timeOptions.map((slot) => ({
          value: slot.value,
          label: slot.label,
        }))}
        placeholder="Время"
        className="w-full min-w-0"
        triggerClassName="btn-sm w-full justify-between"
        searchable
        trailingOption={(query) => ({
          value: CUSTOM_TIME_OPTION_VALUE,
          label: customTimeOptionLabel(query),
        })}
      />
      {useCustomTime ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              ref={startInputRef}
              type="text"
              inputMode="numeric"
              placeholder="09:00"
              className={cn(
                "input input-bordered input-sm w-24 font-mono",
                startError && "input-error",
              )}
              value={displayStart}
              onChange={(event) => {
                setDraftStart(event.target.value);
                if (startError) setStartError("");
              }}
              onBlur={() => commitTimes(displayStart, displayEnd)}
              onKeyDown={handleStartKeyDown}
            />
            <span className="text-base-content/50 shrink-0">–</span>
            <input
              ref={endInputRef}
              type="text"
              inputMode="numeric"
              placeholder="14:30"
              className={cn(
                "input input-bordered input-sm w-24 font-mono",
                endError && "input-error",
              )}
              value={displayEnd}
              onChange={(event) => {
                setDraftEnd(event.target.value);
                if (endError) setEndError("");
              }}
              onBlur={() => commitTimes(displayStart, displayEnd)}
              onKeyDown={handleEndKeyDown}
            />
          </div>
          {startError || endError ? (
            <div className="text-error text-xs">
              {startError && endError && startError === endError
                ? startError
                : [
                    startError && `Начало: ${startError}`,
                    endError && `Конец: ${endError}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function emptyWeeklySlot(
  config: SchemaScheduleConfig,
  audienceTokens?: string[],
): SchemaWeeklyPatternSlot {
  const weekdayKey = weekdayOptionsForConfig(config)[0]?.key ?? "Mon";
  const start =
    timeOptionsForConfig(config, audienceTokens)[0]?.value?.slice(0, 5) ||
    "09:00";
  return {
    weekday: termWeekdayKeyToWeekday(weekdayKey as TermWeekdayKey),
    start_time: toApiTime(start),
    end_time: resolveEndTimeForStart(config, start, audienceTokens),
    room: null,
    instructor: null,
    edits: null,
  };
}

export function emptyOccurrence(
  config: SchemaScheduleConfig,
  audienceTokens?: string[],
): SchemaSessionOccurrence {
  const start =
    timeOptionsForConfig(config, audienceTokens)[0]?.value?.slice(0, 5) ||
    "09:00";
  return {
    date: "",
    start_time: toApiTime(start),
    end_time: resolveEndTimeForStart(config, start, audienceTokens),
    room: null,
    instructor: null,
  };
}

export function draftMeetingsFromOccurrences(
  occurrences: SchemaSessionOccurrence[],
  skipIndex: number,
  deleted: Set<number>,
): Meeting[] {
  const result: Meeting[] = [];
  occurrences.forEach((occurrence, index) => {
    if (index === skipIndex || deleted.has(index)) return;
    const date = String(occurrence.date || "").trim();
    const start = toUiTime(occurrence.start_time);
    if (!date || !start) return;
    const instructor = instructorValue(occurrence.instructor);
    result.push({
      instance_id: `draft:occ:${index}`,
      course: "это же занятие",
      tag: "",
      groups: [],
      date,
      start,
      end: toUiTime(occurrence.end_time) || undefined,
      room: String(occurrence.room || "").trim(),
      instructors: instructor ? [instructor] : [],
      instructor_pool: [],
      section: "",
    });
  });
  return result;
}

export function draftMeetingsFromWeeklySlots(
  slots: SchemaWeeklyPatternSlot[],
  skipIndex: number,
  deleted: Set<number>,
  datesForWeekday: (weekday: TermWeekdayKey) => string[],
): Meeting[] {
  const result: Meeting[] = [];
  slots.forEach((slot, index) => {
    if (index === skipIndex || deleted.has(index)) return;
    const start = toUiTime(slot.start_time);
    const weekday = weekdayToKey(slot.weekday);
    if (!start || !weekday) return;
    const instructor = instructorValue(slot.instructor);
    const room = String(slot.room || "").trim();
    const end = toUiTime(slot.end_time) || undefined;
    for (const date of datesForWeekday(weekday)) {
      result.push({
        instance_id: `draft:wp:${index}:${date}`,
        course: "это же занятие",
        tag: "",
        groups: [],
        date,
        start,
        end,
        room,
        instructors: instructor ? [instructor] : [],
        instructor_pool: [],
        section: "",
      });
    }
  });
  return result;
}

function RoomSelect({
  config,
  meetings,
  meetingIndex,
  extraMeetings,
  value,
  weekday,
  date,
  start,
  end,
  audienceTokens,
  excludeRef,
  onChange,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  extraMeetings?: Meeting[];
  value: string;
  weekday: TermWeekdayKey;
  date?: string;
  start: string;
  end: string;
  audienceTokens: string[];
  excludeRef?: MeetingRef | null;
  onChange: (room: string) => void;
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
    audienceTokens,
    date,
    end,
    excludeRef,
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
    if (!focusDate || !start.trim() || !meetingIndex) {
      return [
        { value: "", label: "—" },
        ...(config.rooms ?? []).map((room) => ({
          value: String(room.id || ""),
          label: String(room.id || room.name || ""),
        })),
      ];
    }
    const hasExtras = Boolean(extraMeetings?.length);
    const meetingsForStatus = hasExtras
      ? [...meetings, ...extraMeetings!]
      : meetings;
    const indexForStatus = hasExtras
      ? buildMeetingPickerIndex(meetingsForStatus)
      : meetingIndex;
    return [
      { value: "", label: "—" },
      ...buildRoomPickerOptions({
        config,
        meetings: meetingsForStatus,
        date: focusDate,
        dates: dates.length ? dates : [focusDate],
        start: start.slice(0, 5),
        end: end.slice(0, 5) || undefined,
        audienceTokens,
        excludeRef,
        includeRoomIds: value ? [value] : undefined,
        index: indexForStatus,
        includeStatus: statusReady,
      }),
    ];
  }, [
    audienceTokens,
    config,
    date,
    end,
    excludeRef,
    extraMeetings,
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
      placeholder="Локация"
      searchable
      matchTriggerWidth={false}
      showHintOnTrigger
      className="w-full min-w-0"
      triggerClassName="btn-sm w-full justify-between"
      menuClassName="min-w-[min(100vw-2rem,22rem)]"
    />
  );
}

export function WeeklySlotRow({
  config,
  meetings,
  meetingIndex,
  extraMeetings,
  slot,
  audienceTokens,
  courseInstructors,
  instructorPool,
  excludeRef,
  onChange,
  onRemove,
  removable = true,
  deleted = false,
  highlighted = false,
  fieldMarks,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  extraMeetings?: Meeting[];
  slot: SchemaWeeklyPatternSlot;
  audienceTokens: string[];
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  excludeRef?: MeetingRef | null;
  onChange: (next: SchemaWeeklyPatternSlot) => void;
  onRemove?: () => void;
  removable?: boolean;
  deleted?: boolean;
  highlighted?: boolean;
  fieldMarks?: SessionRowFieldMarks;
}) {
  const weekdayKey = weekdayToKey(slot.weekday);
  const weekdayOptions = weekdayOptionsForConfig(config);
  const start = toUiTime(slot.start_time);
  const end = toUiTime(slot.end_time);

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        deleted && "border-error/60 border-l-4 pl-2",
      )}
    >
      <div
        className={cn(
          "rounded-box grid gap-2 border-2 p-2 sm:grid-cols-2",
          highlighted ? "border-primary" : "border-base-300",
        )}
      >
        <div className="flex gap-2 sm:col-span-2">
          <div
            className={cn(
              "grid min-w-0 flex-1 gap-2 sm:grid-cols-2",
              deleted && "pointer-events-none opacity-60",
            )}
          >
            <FieldMark hint={deleted ? undefined : fieldMarks?.weekday}>
              <SelectDropdown
                value={weekdayKey}
                onChange={(key) =>
                  onChange({
                    ...slot,
                    weekday: termWeekdayKeyToWeekday(key as TermWeekdayKey),
                  })
                }
                options={weekdayOptions.map((option) => ({
                  value: option.key,
                  label: option.label,
                }))}
                placeholder="День"
                className="w-full min-w-0"
                triggerClassName="btn-sm w-full justify-between"
              />
            </FieldMark>
            <FieldMark hint={deleted ? undefined : fieldMarks?.time}>
              <SlotTimeFields
                config={config}
                startTime={slot.start_time}
                endTime={slot.end_time}
                audienceTokens={audienceTokens}
                onChange={(next) => onChange({ ...slot, ...next })}
              />
            </FieldMark>
          </div>
          {removable && onRemove ? (
            <button
              type="button"
              className={cn(
                "btn btn-ghost btn-sm btn-square pointer-events-auto shrink-0",
                deleted && "text-base-content",
              )}
              title={deleted ? "Вернуть слот" : "Удалить слот"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
            >
              <span
                className={
                  deleted
                    ? "icon-[material-symbols--undo-rounded] text-base"
                    : "icon-[material-symbols--delete-outline-rounded] text-base"
                }
              />
            </button>
          ) : null}
        </div>
        <div
          className={cn(
            "sm:col-span-2",
            deleted && "pointer-events-none opacity-60",
          )}
        >
          <FieldMark hint={deleted ? undefined : fieldMarks?.room}>
            <RoomSelect
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              extraMeetings={extraMeetings}
              value={String(slot.room || "")}
              weekday={weekdayKey}
              start={start}
              end={end}
              audienceTokens={audienceTokens}
              excludeRef={excludeRef}
              onChange={(room) => onChange({ ...slot, room: room || null })}
            />
          </FieldMark>
        </div>
        <div
          className={cn(
            "sm:col-span-2",
            deleted && "pointer-events-none opacity-60",
          )}
        >
          <FieldMark hint={deleted ? undefined : fieldMarks?.instructor}>
            <InstructorPicker
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              extraMeetings={extraMeetings}
              value={instructorValue(slot.instructor)}
              weekday={weekdayKey}
              start={start}
              end={end}
              courseInstructors={courseInstructors}
              instructorPool={instructorPool}
              excludeRef={excludeRef}
              onChange={(instructor) =>
                onChange({ ...slot, instructor: instructor || null })
              }
            />
          </FieldMark>
        </div>
      </div>
      {deleted ? <div className="text-error/80 text-xs">Удалено</div> : null}
    </div>
  );
}

export function OccurrenceRow({
  config,
  meetings,
  meetingIndex,
  extraMeetings,
  occurrence,
  audienceTokens,
  courseInstructors,
  instructorPool,
  excludeRef,
  onChange,
  onRemove,
  removable = true,
  deleted = false,
  highlighted = false,
  fieldMarks,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  extraMeetings?: Meeting[];
  occurrence: SchemaSessionOccurrence;
  audienceTokens: string[];
  courseInstructors?: SchemaCourseConfig["instructors"];
  instructorPool?: unknown[] | null;
  excludeRef?: MeetingRef | null;
  onChange: (next: SchemaSessionOccurrence) => void;
  onRemove?: () => void;
  removable?: boolean;
  deleted?: boolean;
  highlighted?: boolean;
  fieldMarks?: SessionRowFieldMarks;
}) {
  const start = toUiTime(occurrence.start_time);
  const end = toUiTime(occurrence.end_time);
  const weekdayKey = (
    occurrence.date
      ? dayKey(occurrence.date)
      : weekdayOptionsForConfig(config)[0]?.key || "Mon"
  ) as TermWeekdayKey;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        deleted && "border-error/60 border-l-4 pl-2",
      )}
    >
      <div
        className={cn(
          "rounded-box grid gap-2 border-2 p-2 sm:grid-cols-2",
          highlighted ? "border-primary" : "border-base-300",
        )}
      >
        <div className="flex gap-2 sm:col-span-2">
          <div
            className={cn(
              "grid min-w-0 flex-1 gap-2 sm:grid-cols-2",
              deleted && "pointer-events-none opacity-60",
            )}
          >
            <FieldMark hint={deleted ? undefined : fieldMarks?.date}>
              <DateInput
                value={occurrence.date || ""}
                onChange={(date) => onChange({ ...occurrence, date })}
              />
            </FieldMark>
            <FieldMark hint={deleted ? undefined : fieldMarks?.time}>
              <SlotTimeFields
                config={config}
                startTime={occurrence.start_time}
                endTime={occurrence.end_time}
                audienceTokens={audienceTokens}
                onChange={(next) => onChange({ ...occurrence, ...next })}
              />
            </FieldMark>
          </div>
          {removable && onRemove ? (
            <button
              type="button"
              className={cn(
                "btn btn-ghost btn-sm btn-square pointer-events-auto shrink-0",
                deleted && "text-base-content",
              )}
              title={deleted ? "Вернуть дату" : "Удалить дату"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
            >
              <span
                className={
                  deleted
                    ? "icon-[material-symbols--undo-rounded] text-base"
                    : "icon-[material-symbols--delete-outline-rounded] text-base"
                }
              />
            </button>
          ) : null}
        </div>
        <div
          className={cn(
            "sm:col-span-2",
            deleted && "pointer-events-none opacity-60",
          )}
        >
          <FieldMark hint={deleted ? undefined : fieldMarks?.room}>
            <RoomSelect
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              extraMeetings={extraMeetings}
              value={String(occurrence.room || "")}
              weekday={weekdayKey}
              date={occurrence.date || undefined}
              start={start}
              end={end}
              audienceTokens={audienceTokens}
              excludeRef={excludeRef}
              onChange={(room) =>
                onChange({ ...occurrence, room: room || null })
              }
            />
          </FieldMark>
        </div>
        <div
          className={cn(
            "sm:col-span-2",
            deleted && "pointer-events-none opacity-60",
          )}
        >
          <FieldMark hint={deleted ? undefined : fieldMarks?.instructor}>
            <InstructorPicker
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              extraMeetings={extraMeetings}
              value={instructorValue(occurrence.instructor)}
              weekday={weekdayKey}
              date={occurrence.date || undefined}
              start={start}
              end={end}
              courseInstructors={courseInstructors}
              instructorPool={instructorPool}
              excludeRef={excludeRef}
              onChange={(instructor) =>
                onChange({ ...occurrence, instructor: instructor || null })
              }
            />
          </FieldMark>
        </div>
      </div>
      {deleted ? <div className="text-error/80 text-xs">Удалено</div> : null}
    </div>
  );
}
