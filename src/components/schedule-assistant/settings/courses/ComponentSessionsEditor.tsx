import {
  type SchemaComponentSessionSeries,
  type SchemaCourseConfig,
  type SchemaScheduleConfig,
  type SchemaSessionOccurrence,
  type SchemaWeeklyPatternSlot,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import {
  TERM_WEEKDAY_LABEL_RU,
  termWeekdayKeyToWeekday,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { EditClassAudienceMultiSelect } from "@/components/schedule-assistant/timetable/EditClassAudienceMultiSelect.tsx";
import { buildInstructorPickerOptions } from "@/components/schedule-assistant/timetable/instructorPickerOptions.ts";
import {
  CUSTOM_TIME_OPTION_VALUE,
  customTimeOptionLabel,
  formatAudienceTokensLabel,
  normalizeTypedHhmm,
  parseTimeRangeQuery,
  resolveEndTimeForStart,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
  type MeetingRef,
} from "@/components/schedule-assistant/timetable/meetingEditUtils.ts";
import {
  buildRoomPickerOptions,
  roomPickerDatesForEdit,
} from "@/components/schedule-assistant/timetable/roomPickerOptions.ts";
import {
  buildCoursesToSections,
  buildMeetings,
  dayKey,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import {
  buildMeetingPickerIndex,
  type MeetingPickerIndex,
} from "@/components/schedule-assistant/timetable/meetingPickerIndex.ts";
import { useEffect, useMemo, useRef, useState, startTransition } from "react";

function toApiTime(value: string): string {
  const hhmm = normalizeTypedHhmm(value).slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return value;
}

function toUiTime(value: string | null | undefined): string {
  return String(value || "").slice(0, 5);
}

function weekdayToKey(weekday: string): TermWeekdayKey {
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

function instructorToString(
  instructor: string | string[] | null | undefined,
): string {
  if (Array.isArray(instructor)) return String(instructor[0] || "").trim();
  return String(instructor || "").trim();
}

function SlotTimeFields({
  config,
  startTime,
  endTime,
  onChange,
}: {
  config: SchemaScheduleConfig;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  onChange: (next: { start_time: string; end_time: string }) => void;
}) {
  const timeOptions = timeOptionsForConfig(config);
  const start = toUiTime(startTime);
  const end = toUiTime(endTime);
  const isPreset = timeOptions.some(
    (slot) => slot.value === start && (!end || slot.end === end),
  );
  const [forceCustom, setForceCustom] = useState(false);
  const useCustomTime = forceCustom || (Boolean(start) && !isPreset);

  return (
    <div className="flex flex-col gap-2">
      <SelectDropdown
        value={useCustomTime ? CUSTOM_TIME_OPTION_VALUE : start}
        onChange={(value, context) => {
          if (value === CUSTOM_TIME_OPTION_VALUE) {
            setForceCustom(true);
            const parsed = parseTimeRangeQuery(context?.searchQuery ?? "");
            onChange({
              start_time: toApiTime(parsed.start || start || "09:00"),
              end_time: toApiTime(
                parsed.end ||
                  end ||
                  resolveEndTimeForStart(config, parsed.start || start),
              ),
            });
            return;
          }
          setForceCustom(false);
          const next = timeOptions.find((slot) => slot.value === value);
          onChange({
            start_time: toApiTime(value),
            end_time: toApiTime(
              next?.end || resolveEndTimeForStart(config, value),
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="09:00"
            className="input input-bordered input-sm w-24 font-mono"
            value={start}
            onChange={(event) =>
              onChange({
                start_time: toApiTime(event.target.value),
                end_time: toApiTime(end),
              })
            }
            onBlur={() =>
              onChange({
                start_time: toApiTime(normalizeTypedHhmm(start)),
                end_time: toApiTime(end),
              })
            }
          />
          <span className="text-base-content/50 shrink-0">–</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="14:30"
            className="input input-bordered input-sm w-24 font-mono"
            value={end}
            onChange={(event) =>
              onChange({
                start_time: toApiTime(start),
                end_time: toApiTime(event.target.value),
              })
            }
            onBlur={() =>
              onChange({
                start_time: toApiTime(start),
                end_time: toApiTime(normalizeTypedHhmm(end)),
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function emptyWeeklySlot(
  config: SchemaScheduleConfig,
): SchemaWeeklyPatternSlot {
  const weekdayKey = weekdayOptionsForConfig(config)[0]?.key ?? "Mon";
  const start = timeOptionsForConfig(config)[0]?.value?.slice(0, 5) || "09:00";
  return {
    weekday: termWeekdayKeyToWeekday(weekdayKey as TermWeekdayKey),
    start_time: toApiTime(start),
    end_time: resolveEndTimeForStart(config, start),
    room: null,
    instructor: null,
    edits: null,
  };
}

function emptyOccurrence(
  config: SchemaScheduleConfig,
): SchemaSessionOccurrence {
  const start = timeOptionsForConfig(config)[0]?.value?.slice(0, 5) || "09:00";
  return {
    date: "",
    start_time: toApiTime(start),
    end_time: resolveEndTimeForStart(config, start),
    room: null,
    instructor: null,
  };
}

function emptySeries(): SchemaComponentSessionSeries {
  return {
    audience: [],
    weekly_pattern: [],
    occurrences: null,
  };
}

type SeriesMode = "weekly" | "occurrences";

function seriesMode(series: SchemaComponentSessionSeries): SeriesMode {
  if ((series.occurrences ?? []).length > 0) return "occurrences";
  return "weekly";
}

function SeriesAudienceButton({
  config,
  tokens,
  onChange,
}: {
  config: SchemaScheduleConfig;
  tokens: string[];
  onChange: (tokens: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = tokens.length
    ? formatAudienceTokensLabel(config, tokens)
    : "Как у компонента";

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-xs gap-1"
        onClick={() => setOpen(true)}
        title="Изменить аудиторию серии"
      >
        <span className="max-w-[14rem] truncate">Аудитория: {label}</span>
        <span className="icon-[material-symbols--edit-outline-rounded] shrink-0 text-sm opacity-70" />
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Аудитория серии"
        containerClassName="max-w-xl"
      >
        <div className="flex flex-col gap-3">
          <p className="text-base-content/60 text-xs">
            Пусто — наследует группы компонента.
          </p>
          <EditClassAudienceMultiSelect
            editorOnly
            config={config}
            tokens={tokens}
            onChange={onChange}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange([])}
            >
              Сбросить
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setOpen(false)}
            >
              Готово
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function RoomSelect({
  config,
  meetings,
  meetingIndex,
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
    setStatusReady(false);
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
    value,
    weekday,
  ]);

  const options = useMemo(() => {
    const dates = roomPickerDatesForEdit({ config, weekday });
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
    return [
      { value: "", label: "—" },
      ...buildRoomPickerOptions({
        config,
        meetings,
        date: focusDate,
        dates: dates.length ? dates : [focusDate],
        start: start.slice(0, 5),
        end: end.slice(0, 5) || undefined,
        audienceTokens,
        excludeRef,
        includeRoomIds: value ? [value] : undefined,
        index: meetingIndex,
        includeStatus: statusReady,
      }),
    ];
  }, [
    audienceTokens,
    config,
    date,
    end,
    excludeRef,
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
      placeholder="Аудитория"
      searchable
      matchTriggerWidth={false}
      showHintOnTrigger
      className="w-full min-w-0"
      triggerClassName="btn-sm w-full justify-between"
      menuClassName="min-w-[min(100vw-2rem,22rem)]"
    />
  );
}

function InstructorSelect({
  config,
  meetings,
  meetingIndex,
  value,
  weekday,
  date,
  start,
  end,
  courseInstructors,
  excludeRef,
  onChange,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  value: string;
  weekday: TermWeekdayKey;
  date?: string;
  start: string;
  end: string;
  courseInstructors: SchemaCourseConfig["instructors"];
  excludeRef?: MeetingRef | null;
  onChange: (instructorId: string) => void;
}) {
  const [statusReady, setStatusReady] = useState(false);

  useEffect(() => {
    setStatusReady(false);
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
    excludeRef,
    meetingIndex,
    start,
    value,
    weekday,
  ]);

  const options = useMemo(() => {
    const dates = roomPickerDatesForEdit({ config, weekday });
    const focusDate = date?.trim() || dates[0] || "";
    if (!focusDate || !start.trim() || !meetingIndex) {
      return [{ value: "", label: "—" }];
    }
    return [
      { value: "", label: "—" },
      ...buildInstructorPickerOptions({
        config,
        meetings,
        date: focusDate,
        dates: dates.length ? dates : [focusDate],
        start: start.slice(0, 5),
        end: end.slice(0, 5) || undefined,
        weekday,
        courseInstructors,
        excludeRef,
        includeInstructorIds: value ? [value] : undefined,
        index: meetingIndex,
        includeStatus: statusReady,
      }),
    ];
  }, [
    config,
    courseInstructors,
    date,
    end,
    excludeRef,
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
      placeholder="Преподаватель"
      searchable
      matchTriggerWidth={false}
      showHintOnTrigger
      className="w-full min-w-0"
      triggerClassName="btn-sm w-full justify-between"
      menuClassName="min-w-[min(100vw-2rem,22rem)]"
    />
  );
}

function WeeklySlotRow({
  config,
  meetings,
  meetingIndex,
  slot,
  audienceTokens,
  courseInstructors,
  excludeRef,
  onChange,
  onRemove,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  slot: SchemaWeeklyPatternSlot;
  audienceTokens: string[];
  courseInstructors: SchemaCourseConfig["instructors"];
  excludeRef?: MeetingRef | null;
  onChange: (next: SchemaWeeklyPatternSlot) => void;
  onRemove: () => void;
}) {
  const weekdayKey = weekdayToKey(slot.weekday);
  const weekdayOptions = weekdayOptionsForConfig(config);
  const start = toUiTime(slot.start_time);
  const end = toUiTime(slot.end_time);

  return (
    <div className="border-base-300 rounded-box grid gap-2 border p-2 sm:grid-cols-2">
      <div className="flex gap-2 sm:col-span-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
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
          <SlotTimeFields
            config={config}
            startTime={slot.start_time}
            endTime={slot.end_time}
            onChange={(next) => onChange({ ...slot, ...next })}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          title="Удалить слот"
          onClick={onRemove}
        >
          <span className="icon-[material-symbols--delete-outline-rounded] text-base" />
        </button>
      </div>
      <div className="sm:col-span-2">
        <RoomSelect
          config={config}
          meetings={meetings}
          meetingIndex={meetingIndex}
          value={String(slot.room || "")}
          weekday={weekdayKey}
          start={start}
          end={end}
          audienceTokens={audienceTokens}
          excludeRef={excludeRef}
          onChange={(room) => onChange({ ...slot, room: room || null })}
        />
      </div>
      <div className="sm:col-span-2">
        <InstructorSelect
          config={config}
          meetings={meetings}
          meetingIndex={meetingIndex}
          value={instructorToString(slot.instructor)}
          weekday={weekdayKey}
          start={start}
          end={end}
          courseInstructors={courseInstructors}
          excludeRef={excludeRef}
          onChange={(instructor) =>
            onChange({ ...slot, instructor: instructor || null })
          }
        />
      </div>
    </div>
  );
}

function OccurrenceRow({
  config,
  meetings,
  meetingIndex,
  occurrence,
  audienceTokens,
  courseInstructors,
  excludeRef,
  onChange,
  onRemove,
}: {
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingIndex: MeetingPickerIndex | null;
  occurrence: SchemaSessionOccurrence;
  audienceTokens: string[];
  courseInstructors: SchemaCourseConfig["instructors"];
  excludeRef?: MeetingRef | null;
  onChange: (next: SchemaSessionOccurrence) => void;
  onRemove: () => void;
}) {
  const start = toUiTime(occurrence.start_time);
  const end = toUiTime(occurrence.end_time);
  const weekdayKey = (
    occurrence.date
      ? dayKey(occurrence.date)
      : weekdayOptionsForConfig(config)[0]?.key || "Mon"
  ) as TermWeekdayKey;

  return (
    <div className="border-base-300 rounded-box grid gap-2 border p-2 sm:grid-cols-2">
      <div className="flex gap-2 sm:col-span-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            className="input input-bordered input-sm w-full"
            value={occurrence.date || ""}
            onChange={(event) =>
              onChange({ ...occurrence, date: event.target.value })
            }
          />
          <SlotTimeFields
            config={config}
            startTime={occurrence.start_time}
            endTime={occurrence.end_time}
            onChange={(next) => onChange({ ...occurrence, ...next })}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          title="Удалить дату"
          onClick={onRemove}
        >
          <span className="icon-[material-symbols--delete-outline-rounded] text-base" />
        </button>
      </div>
      <div className="sm:col-span-2">
        <RoomSelect
          config={config}
          meetings={meetings}
          meetingIndex={meetingIndex}
          value={String(occurrence.room || "")}
          weekday={weekdayKey}
          date={occurrence.date || undefined}
          start={start}
          end={end}
          audienceTokens={audienceTokens}
          excludeRef={excludeRef}
          onChange={(room) => onChange({ ...occurrence, room: room || null })}
        />
      </div>
      <div className="sm:col-span-2">
        <InstructorSelect
          config={config}
          meetings={meetings}
          meetingIndex={meetingIndex}
          value={instructorToString(occurrence.instructor)}
          weekday={weekdayKey}
          date={occurrence.date || undefined}
          start={start}
          end={end}
          courseInstructors={courseInstructors}
          excludeRef={excludeRef}
          onChange={(instructor) =>
            onChange({ ...occurrence, instructor: instructor || null })
          }
        />
      </div>
    </div>
  );
}

export function ComponentSessionsEditor({
  config,
  courseIndex,
  componentIndex,
  sessions,
  courseInstructors,
  componentGroups,
  onChange,
}: {
  config: SchemaScheduleConfig;
  courseIndex?: number | null;
  componentIndex?: number | null;
  sessions: SchemaComponentSessionSeries[] | null | undefined;
  courseInstructors?: SchemaCourseConfig["instructors"];
  componentGroups?: string[] | null;
  onChange: (next: SchemaComponentSessionSeries[] | null) => void;
}) {
  const list = sessions ?? [];
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingIndex, setMeetingIndex] = useState<MeetingPickerIndex | null>(
    null,
  );
  const modeStashRef = useRef(
    new Map<
      number,
      {
        weekly_pattern?: SchemaComponentSessionSeries["weekly_pattern"];
        occurrences?: SchemaComponentSessionSeries["occurrences"];
      }
    >(),
  );

  useEffect(() => {
    modeStashRef.current = new Map();
  }, [courseIndex, componentIndex]);

  useEffect(() => {
    let cancelled = false;
    setMeetingIndex(null);
    const frame = requestAnimationFrame(() => {
      startTransition(() => {
        if (cancelled) return;
        const nextMeetings = buildMeetings(
          config,
          buildCoursesToSections(config),
        );
        const nextIndex = buildMeetingPickerIndex(nextMeetings);
        if (cancelled) return;
        setMeetings(nextMeetings);
        setMeetingIndex(nextIndex);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [config]);

  function slotExcludeRef(
    seriesIndex: number,
    slotIndex: number,
  ): MeetingRef | null {
    if (courseIndex == null || componentIndex == null) return null;
    return {
      kind: "wp",
      courseIdx: courseIndex,
      componentIdx: componentIndex,
      seriesIdx: seriesIndex,
      slotIdx: slotIndex,
      date: "",
    };
  }

  function occurrenceExcludeRef(
    seriesIndex: number,
    occIndex: number,
  ): MeetingRef | null {
    if (courseIndex == null || componentIndex == null) return null;
    return {
      kind: "occ",
      courseIdx: courseIndex,
      componentIdx: componentIndex,
      seriesIdx: seriesIndex,
      occIdx: occIndex,
    };
  }

  function updateSeries(
    index: number,
    patch: Partial<SchemaComponentSessionSeries>,
  ) {
    onChange(
      list.map((series, i) => (i === index ? { ...series, ...patch } : series)),
    );
  }

  function setMode(index: number, mode: SeriesMode) {
    const series = list[index];
    if (!series) return;
    const stash = modeStashRef.current.get(index) ?? {};

    if (mode === "weekly") {
      if ((series.occurrences ?? []).length > 0) {
        stash.occurrences = series.occurrences ?? null;
      }
      const weekly = (series.weekly_pattern?.length
        ? series.weekly_pattern
        : stash.weekly_pattern?.length
          ? stash.weekly_pattern
          : null) ?? [emptyWeeklySlot(config)];
      modeStashRef.current.set(index, stash);
      updateSeries(index, {
        weekly_pattern: weekly,
        occurrences: null,
      });
      return;
    }

    if ((series.weekly_pattern ?? []).length > 0) {
      stash.weekly_pattern = series.weekly_pattern ?? null;
    }
    const occurrences = (series.occurrences?.length
      ? series.occurrences
      : stash.occurrences?.length
        ? stash.occurrences
        : null) ?? [emptyOccurrence(config)];
    modeStashRef.current.set(index, stash);
    updateSeries(index, {
      weekly_pattern: null,
      occurrences,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {list.length === 0 ? (
        <div className="text-base-content/60 text-sm">
          Нет размещённых серий. Можно оставить пустым и планировать позже.
        </div>
      ) : null}

      {list.map((series, seriesIndex) => {
        const mode = seriesMode(series);
        const audienceTokens = series.audience?.length
          ? series.audience
          : (componentGroups ?? []);
        return (
          <div
            key={seriesIndex}
            className="border-base-300 rounded-box flex flex-col gap-2 border p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Серия {seriesIndex + 1}</div>
              <div className="flex flex-wrap items-center gap-1">
                <SeriesAudienceButton
                  config={config}
                  tokens={series.audience ?? []}
                  onChange={(audience) =>
                    updateSeries(seriesIndex, { audience })
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  title="Удалить серию"
                  onClick={() =>
                    onChange(list.filter((_, i) => i !== seriesIndex))
                  }
                >
                  <span className="icon-[material-symbols--delete-outline-rounded] text-base" />
                </button>
              </div>
            </div>

            <div className="join">
              <button
                type="button"
                className={`btn btn-sm join-item ${mode === "weekly" ? "btn-active" : ""}`}
                onClick={() => setMode(seriesIndex, "weekly")}
              >
                Еженедельно
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${mode === "occurrences" ? "btn-active" : ""}`}
                onClick={() => setMode(seriesIndex, "occurrences")}
              >
                Даты
              </button>
            </div>

            {mode === "weekly" ? (
              <div className="flex flex-col gap-2">
                {(series.weekly_pattern ?? []).map((slot, slotIndex) => (
                  <WeeklySlotRow
                    key={slotIndex}
                    config={config}
                    meetings={meetings}
                    meetingIndex={meetingIndex}
                    slot={slot}
                    audienceTokens={audienceTokens}
                    courseInstructors={courseInstructors}
                    excludeRef={slotExcludeRef(seriesIndex, slotIndex)}
                    onChange={(next) => {
                      const weekly = [...(series.weekly_pattern ?? [])];
                      weekly[slotIndex] = next;
                      updateSeries(seriesIndex, { weekly_pattern: weekly });
                    }}
                    onRemove={() => {
                      const weekly = (series.weekly_pattern ?? []).filter(
                        (_, i) => i !== slotIndex,
                      );
                      updateSeries(seriesIndex, {
                        weekly_pattern: weekly.length ? weekly : [],
                      });
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm self-start"
                  onClick={() =>
                    updateSeries(seriesIndex, {
                      weekly_pattern: [
                        ...(series.weekly_pattern ?? []),
                        emptyWeeklySlot(config),
                      ],
                    })
                  }
                >
                  + Слот
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(series.occurrences ?? []).map((occurrence, occIndex) => (
                  <OccurrenceRow
                    key={occIndex}
                    config={config}
                    meetings={meetings}
                    meetingIndex={meetingIndex}
                    occurrence={occurrence}
                    audienceTokens={audienceTokens}
                    courseInstructors={courseInstructors}
                    excludeRef={occurrenceExcludeRef(seriesIndex, occIndex)}
                    onChange={(next) => {
                      const occurrences = [...(series.occurrences ?? [])];
                      occurrences[occIndex] = next;
                      updateSeries(seriesIndex, { occurrences });
                    }}
                    onRemove={() => {
                      const occurrences = (series.occurrences ?? []).filter(
                        (_, i) => i !== occIndex,
                      );
                      updateSeries(seriesIndex, {
                        occurrences: occurrences.length ? occurrences : [],
                      });
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm self-start"
                  onClick={() =>
                    updateSeries(seriesIndex, {
                      occurrences: [
                        ...(series.occurrences ?? []),
                        emptyOccurrence(config),
                      ],
                    })
                  }
                >
                  + Дата
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        onClick={() =>
          onChange([
            ...list,
            {
              ...emptySeries(),
              weekly_pattern: [emptyWeeklySlot(config)],
            },
          ])
        }
      >
        + Серия
      </button>
    </div>
  );
}

export function summarizeSessions(
  sessions: SchemaComponentSessionSeries[] | null | undefined,
): string {
  if (!sessions?.length) return "";
  const weekly = sessions.reduce(
    (sum, series) => sum + (series.weekly_pattern?.length ?? 0),
    0,
  );
  const dates = sessions.reduce(
    (sum, series) => sum + (series.occurrences?.length ?? 0),
    0,
  );
  const parts: string[] = [];
  if (weekly) parts.push(`${weekly} слот.`);
  if (dates) parts.push(`${dates} дат`);
  if (!parts.length) parts.push(`${sessions.length} сер.`);
  return parts.join(", ");
}

export function formatWeeklySlotChip(slot: SchemaWeeklyPatternSlot): string {
  const key = weekdayToKey(slot.weekday);
  return `${TERM_WEEKDAY_LABEL_RU[key]} ${toUiTime(slot.start_time)}`;
}
