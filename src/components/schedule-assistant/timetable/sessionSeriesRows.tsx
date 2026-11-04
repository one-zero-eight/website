import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaSessionActiveWindow,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import {
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { InstructorPicker } from "@/components/schedule-assistant/timetable/InstructorPicker.tsx";
import { DateInput } from "@/components/schedule-assistant/DateInput.tsx";
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
  VIRTUAL_ROOM_ID,
} from "@/components/schedule-assistant/timetable/roomPickerOptions.ts";
import {
  dayKey,
  resolveWeeklyMeetingFields,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { instructorValue } from "@/components/schedule-assistant/timetable/sessionSeriesValidation.ts";
import { SessionEventCard } from "@/components/schedule-assistant/timetable/SessionEventCard.tsx";
import { cn } from "@/lib/ui/cn";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Weekday } from "@/api/schedule-assistant/types.ts";
import { localizedBlockName } from "@/components/schedule-assistant/timetable/localizedNames.ts";
import {
  activeForBlock,
  blockIdFromActive,
  matchSessionBlock,
  resolveSessionWindow,
  sessionWindowRange,
} from "./sessionWindows.ts";
import {
  formatDisplayDate,
  inactiveWeeklySlotEdits,
  weekStartForDate,
} from "./timetableViewerModel.ts";
import { weeklyPickerSlots } from "./meetingPickerSchedule.ts";
import { expandWeeklySlotsToEvents } from "./editableSessionEvents.ts";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type SessionWindowValue = {
  active: SchemaSessionActiveWindow | null;
};

export function sessionWindowSummaryLabel(
  config: SchemaScheduleConfig,
  active?: SchemaSessionActiveWindow | null,
): string {
  const blockId = blockIdFromActive(active);
  if (blockId) {
    const block = matchSessionBlock(config, blockId);
    return block ? localizedBlockName(block) : blockId;
  }
  const resolved = sessionWindowRange(config, active);
  if (resolved?.start_date && resolved?.end_date) {
    return `${formatDisplayDate(resolved.start_date)}–${formatDisplayDate(resolved.end_date)}`;
  }
  return i18n._(msg`whole semester`);
}

export type SessionRowFieldMark = "changed" | "overridden";

export type SessionRowFieldHint = {
  mark?: SessionRowFieldMark;
  originalLabel?: string;
  onRestore?: () => void;
};

export type SessionRowFieldMarks = {
  date?: SessionRowFieldHint;
  weekday?: SessionRowFieldHint;
  alternation?: SessionRowFieldHint;
  time?: SessionRowFieldHint;
  room?: SessionRowFieldHint;
  instructor?: SessionRowFieldHint;
};

export function FieldMark({
  hint,
  children,
  overridden = false,
  reserveGutter = true,
}: {
  hint?: SessionRowFieldHint;
  children: ReactNode;
  overridden?: boolean;
  reserveGutter?: boolean;
}) {
  const mark = hint?.mark;

  // Keep the wrapper stable so marks never remount or shift the inputs.
  return (
    <div
      className={cn(
        reserveGutter ? "border-l-4 pl-2" : "relative",
        reserveGutter && mark === "changed" && "border-warning/60",
        reserveGutter && mark === "overridden" && "border-info/60",
        reserveGutter && !mark && "border-transparent",
        !reserveGutter &&
          mark &&
          "before:absolute before:inset-y-0 before:-left-1.5 before:w-0.5 before:rounded-full",
        !reserveGutter && mark === "changed" && "before:bg-warning/60",
        !reserveGutter && mark === "overridden" && "before:bg-info/60",
      )}
    >
      <div
        className={cn(
          overridden &&
            "[&_[data-select-value]]:underline [&_[data-select-value]]:decoration-sky-400 [&_[data-select-value]]:decoration-wavy [&_[data-select-value]]:decoration-1 [&_[data-select-value]]:underline-offset-2 [&_input]:underline [&_input]:decoration-sky-400 [&_input]:decoration-wavy [&_input]:decoration-1 [&_input]:underline-offset-2",
        )}
      >
        {children}
      </div>
      {mark === "changed" && hint?.originalLabel != null && hint.onRestore ? (
        <div className="text-base-content/55 mt-1 text-xs">
          <Trans>Was:</Trans>{" "}
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
          <Trans>overridden in template</Trans>
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
  const { t } = useLingui();
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
      ? t`Enter a time`
      : parsedStart
        ? ""
        : t`Invalid time`;
    const nextEndError = !endRaw
      ? t`Enter a time`
      : parsedEnd
        ? ""
        : t`Invalid time`;

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
        placeholder={t`Time`}
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
                    startError && t`Start: ${startError}`,
                    endError && t`End: ${endError}`,
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

export function WeeklyAlternationFields({
  config,
  slot,
  audienceTokens,
  active = null,
  onChange,
  onSessionWindowChange,
}: {
  config: SchemaScheduleConfig;
  slot: SchemaWeeklyPatternSlot;
  audienceTokens: string[];
  active?: SchemaSessionActiveWindow | null;
  onChange: (slot: SchemaWeeklyPatternSlot) => void;
  onSessionWindowChange?: (window: SessionWindowValue) => void;
}) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;
  const window = resolveSessionWindow(config, audienceTokens, active);
  const ignoredEdits = inactiveWeeklySlotEdits(config, slot);
  const preview = expandWeeklySlotsToEvents({
    config,
    weeklySlots: [slot],
    audienceTokens,
    active,
  })
    .filter((event) => !event.cancelled)
    .slice(0, 6);
  const frequencyLabel = slot.alternation ? t`Every other week` : t`Every week`;
  const windowLabel = sessionWindowSummaryLabel(config, active);
  const triggerLabel = `${frequencyLabel}, ${windowLabel}`;
  const blocks = config.term.blocks ?? [];
  const boundBlockId = blockIdFromActive(active);
  const windowKey = boundBlockId
    ? `block:${boundBlockId}`
    : active
      ? "custom"
      : "semester";
  const canEditWindow = Boolean(onSessionWindowChange);
  const previewDates = preview.length
    ? preview.map((event) => formatDisplayDate(event.date)).join(", ")
    : t`none in the study period`;
  const ignoredCount = ignoredEdits.length;
  const ignoredDates = ignoredEdits
    .map((edit) => formatDisplayDate(edit.select_week))
    .join(", ");

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  function handleFrequencyChange(next: "weekly" | "alternate") {
    if ((next === "alternate") === Boolean(slot.alternation)) return;
    onChange({
      ...slot,
      alternation:
        next === "alternate"
          ? {
              anchor_week: weekStartForDate(
                window?.start_date || config.term.semester.start_date,
                startingDay,
              ),
            }
          : null,
    });
  }

  function handleWindowChange(nextKey: string) {
    if (!onSessionWindowChange) return;
    if (nextKey === "semester") {
      onSessionWindowChange({ active: null });
      return;
    }
    if (nextKey.startsWith("block:")) {
      onSessionWindowChange({
        active: activeForBlock(nextKey.slice("block:".length)),
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full min-w-0 shrink-0">
        <button
          type="button"
          ref={refs.setReference}
          className="select select-bordered select-xs btn-sm flex h-8 min-h-8 w-full cursor-pointer items-center justify-between px-3 text-left text-sm font-normal"
          {...getReferenceProps()}
        >
          <span className="truncate">{triggerLabel}</span>
        </button>
        {open ? (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                className="border-base-300 bg-base-100 rounded-box z-50 flex flex-col gap-3 border p-3 shadow-lg"
                {...getFloatingProps()}
              >
                <div className="flex flex-col gap-1">
                  <div className="text-base-content/60 text-xs font-medium uppercase">
                    <Trans>Period</Trans>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(
                      [
                        { key: "semester", label: t`Whole semester` },
                        ...blocks.map((block) => ({
                          key: `block:${block.id}`,
                          label: localizedBlockName(block),
                        })),
                        ...(windowKey === "custom"
                          ? [
                              {
                                key: "custom",
                                label: windowLabel,
                              },
                            ]
                          : []),
                      ] as { key: string; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        disabled={
                          option.key === "custom" ||
                          (!canEditWindow && option.key !== windowKey)
                        }
                        className={cn(
                          "btn btn-ghost btn-sm justify-start font-normal",
                          option.key === windowKey && "btn-active",
                        )}
                        onClick={() => handleWindowChange(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-base-content/60 text-xs font-medium uppercase">
                    <Trans>Frequency</Trans>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(
                      [
                        { key: "weekly", label: t`Every week` },
                        { key: "alternate", label: t`Every other week` },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={cn(
                          "btn btn-ghost btn-sm justify-start font-normal",
                          (option.key === "alternate") ===
                            Boolean(slot.alternation) && "btn-active",
                        )}
                        onClick={() => handleFrequencyChange(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {slot.alternation ? (
                  <div className="border-base-300 flex flex-col gap-2 border-t pt-2">
                    <label className="flex flex-col gap-1 text-xs">
                      <Trans>Anchor active week</Trans>
                      <DateInput
                        value={slot.alternation.anchor_week}
                        onChange={(date) => {
                          if (!date) return;
                          onChange({
                            ...slot,
                            alternation: {
                              anchor_week: weekStartForDate(date, startingDay),
                            },
                          });
                        }}
                      />
                    </label>
                    <p className="text-base-content/60 text-xs">
                      <Trans>
                        The phase covers the whole study period: every 14 days
                        before and after the anchor week, not starting from this
                        date.
                      </Trans>
                    </p>
                    <p className="text-base-content/70 text-xs">
                      <Trans>Class dates: {previewDates}.</Trans>
                    </p>
                  </div>
                ) : null}
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        ) : null}
      </div>
      {ignoredEdits.length ? (
        <p className="text-warning text-xs">
          <Trans>
            One-off changes for inactive weeks ({ignoredCount}) are saved but
            not applied: {ignoredDates}.
          </Trans>
        </p>
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
  lockedRowCount = 0,
): Meeting[] {
  const result: Meeting[] = [];
  occurrences.forEach((occurrence, index) => {
    if (index < lockedRowCount || index === skipIndex || deleted.has(index))
      return;
    const date = String(occurrence.date || "").trim();
    const start = toUiTime(occurrence.start_time);
    if (!date || !start) return;
    const instructors = occurrence.instructor ?? [];
    result.push({
      instance_id: `draft:occ:${index}`,
      course: i18n._(msg`this same class`),
      tag: "",
      groups: [],
      date,
      start,
      end: toUiTime(occurrence.end_time) || undefined,
      room: String(occurrence.room || "").trim(),
      instructors: Array.isArray(instructors) ? instructors : [instructors],
      instructor_pool: [],
      section: "",
    });
  });
  return result;
}

export function draftMeetingsFromWeeklySlots(
  config: SchemaScheduleConfig,
  slots: SchemaWeeklyPatternSlot[],
  audienceTokens: string[],
  skipIndex: number,
  deleted: Set<number>,
  lockedRowCount = 0,
  active?: SchemaSessionActiveWindow | null,
): Meeting[] {
  return expandWeeklySlotsToEvents({
    config,
    weeklySlots: slots,
    audienceTokens,
    active,
  })
    .filter(
      (event) =>
        event.source.kind === "weekly" &&
        event.source.slotIdx >= lockedRowCount &&
        event.source.slotIdx !== skipIndex &&
        !deleted.has(event.source.slotIdx) &&
        !event.cancelled,
    )
    .flatMap((event) => {
      if (event.source.kind !== "weekly") return [];
      const { instructors } = resolveWeeklyMeetingFields(
        slots[event.source.slotIdx],
        event.source.patternDate,
        config,
      );
      return [
        {
          instance_id: `draft:${event.key}`,
          course: i18n._(msg`this same class`),
          tag: "",
          groups: audienceTokens,
          date: event.date,
          start: toUiTime(event.start_time),
          end: toUiTime(event.end_time) || undefined,
          room: event.room || "",
          instructors: Array.isArray(instructors)
            ? instructors
            : instructors
              ? [instructors]
              : [],
          instructor_pool: [],
          section: "",
        },
      ];
    });
}

export function RoomSelect({
  config,
  meetings,
  meetingIndex,
  extraMeetings,
  pickerSelection,
  value,
  weekday,
  weeklySlot,
  active,
  date,
  start,
  end,
  audienceTokens,
  excludeRef,
  excludeInstanceId,
  onChange,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  extraMeetings?: Meeting[];
  pickerSelection?: Meeting[];
  value: string;
  weekday: TermWeekdayKey;
  weeklySlot?: SchemaWeeklyPatternSlot;
  active?: SchemaSessionActiveWindow | null;
  date?: string;
  start: string;
  end: string;
  audienceTokens: string[];
  excludeRef?: MeetingRef | null;
  excludeInstanceId?: string | null;
  onChange: (room: string) => void;
}) {
  const { t } = useLingui();
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
    excludeInstanceId,
    meetingIndex,
    start,
    statusReady,
    value,
    weekday,
    weeklySlot,
  ]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const buildOptions = useCallback(
    (selection?: Meeting[]) => {
      const slots = date?.trim()
        ? [{ date: date.trim(), start, end }]
        : weeklySlot
          ? weeklyPickerSlots(
              config,
              weeklySlot,
              audienceTokens,
              "room",
              active,
            )
          : [];
      const dates = slots.map((slot) => slot.date);
      if (!start.trim() || !meetingIndex) {
        return [
          { value: "", label: "—" },
          { value: VIRTUAL_ROOM_ID, label: VIRTUAL_ROOM_ID },
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
          dates,
          slots,
          weekly: Boolean(weeklySlot) || Boolean(selection?.length),
          selection,
          start: start.slice(0, 5),
          end: end.slice(0, 5) || undefined,
          audienceTokens,
          excludeRef,
          excludeInstanceId,
          includeRoomIds: value ? [value] : undefined,
          index: indexForStatus,
          includeStatus: statusReady,
        }),
      ];
    },
    [
      active,
      audienceTokens,
      config,
      date,
      end,
      excludeRef,
      excludeInstanceId,
      extraMeetings,
      meetingIndex,
      meetings,
      start,
      statusReady,
      value,
      weeklySlot,
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
      placeholder={t`Location`}
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
  active,
  onSessionWindowChange,
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
  active?: SchemaSessionActiveWindow | null;
  onSessionWindowChange?: (window: SessionWindowValue) => void;
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
  const { t } = useLingui();
  const weekdayKey = weekdayToKey(slot.weekday);
  const weekdayOptions = weekdayOptionsForConfig(config);
  const start = toUiTime(slot.start_time);
  const end = toUiTime(slot.end_time);
  const resolvedActive = sessionWindowRange(config, active);

  return (
    <SessionEventCard deleted={deleted} highlighted={highlighted}>
      <div className="grid gap-2 sm:grid-cols-2">
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
                placeholder={t`Day`}
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
              title={deleted ? t`Restore slot` : t`Delete slot`}
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
            "flex flex-col gap-2 sm:col-span-2",
            deleted && "pointer-events-none opacity-60",
          )}
        >
          <FieldMark hint={deleted ? undefined : fieldMarks?.alternation}>
            <WeeklyAlternationFields
              config={config}
              slot={slot}
              active={active}
              audienceTokens={audienceTokens}
              onChange={onChange}
              onSessionWindowChange={onSessionWindowChange}
            />
          </FieldMark>
          <FieldMark hint={deleted ? undefined : fieldMarks?.room}>
            <RoomSelect
              config={config}
              meetings={meetings}
              meetingIndex={meetingIndex}
              extraMeetings={extraMeetings}
              value={String(slot.room || "")}
              weekday={weekdayKey}
              weeklySlot={slot}
              active={resolvedActive}
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
              weeklySlot={slot}
              active={resolvedActive}
              start={start}
              end={end}
              audienceTokens={audienceTokens}
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
      {deleted ? (
        <div className="text-error/80 text-xs">
          <Trans>Deleted</Trans>
        </div>
      ) : null}
    </SessionEventCard>
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
  const { t } = useLingui();
  const start = toUiTime(occurrence.start_time);
  const end = toUiTime(occurrence.end_time);
  const weekdayKey = (
    occurrence.date
      ? dayKey(occurrence.date)
      : weekdayOptionsForConfig(config)[0]?.key || "Mon"
  ) as TermWeekdayKey;

  return (
    <SessionEventCard deleted={deleted} highlighted={highlighted}>
      <div className="grid gap-2 sm:grid-cols-2">
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
                showWeekday
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
              title={deleted ? t`Restore date` : t`Delete date`}
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
              audienceTokens={audienceTokens}
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
      {deleted ? (
        <div className="text-error/80 text-xs">
          <Trans>Deleted</Trans>
        </div>
      ) : null}
    </SessionEventCard>
  );
}
