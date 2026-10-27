import type { TimetableViewConfig as SchemaScheduleConfig } from "./timetableViewTypes.ts";
import { cn } from "@/lib/ui/cn";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Link } from "@tanstack/react-router";
import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  MeetingMetadataField,
  MeetingMetadataLabels,
  MeetingMetadataRow,
  meetingMetadataCardClass,
  meetingMetadataGridClass,
  meetingMetadataOverrideClass,
  meetingMetadataSubgridClass,
  meetingMetadataTextClass,
} from "./MeetingMetadata.tsx";
import { meetingColorStyle } from "./timetableGroupsGridLayout.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import { UnarrangedLessonsPanel } from "./UnarrangedLessonsPanel.tsx";
import {
  countUnarrangedSessions,
  type UnarrangedComponentGroup,
  type UnarrangedLessonItem,
} from "./unarrangedLessons.ts";
import {
  listPersonalMeetingsByDay,
  resolvePersonalInstructorId,
  type PersonalMeetingEntry,
  type PersonalTimetableGroup,
} from "./timetablePersonalization.ts";
import { useSelectionStore } from "./timetableSelectionStore.ts";
import {
  buildInstructorLabelById,
  colorBySubject,
  resolveInstructorLabel,
  todayIsoDate,
  type Meeting,
} from "./timetableViewerModel.ts";

const personalLinkClass =
  "cursor-pointer text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid";

import {
  buildTimetableSearchEntries,
  buildTimetableSeriesEntry,
  timetableOccurrenceDifferences,
  searchTimetableEntries,
} from "./timetableSearch.ts";

export type PersonalLessonsState =
  | { kind: "guest"; onSignIn: () => void }
  | { kind: "pending" }
  | { kind: "error"; message: string; onRetry: () => void }
  | { kind: "empty" }
  | { kind: "ready" };

function TimetableEventSearch({
  meetings,
  config,
  onSelect,
  activeDate,
}: {
  meetings: Meeting[];
  config: SchemaScheduleConfig;
  onSelect: (meeting: Meeting) => void;
  activeDate: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const instructorLabels = useMemo(
    () => buildInstructorLabelById(config),
    [config],
  );
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const entries = useMemo(
    () => buildTimetableSearchEntries(meetings, instructorLabels, config),
    [meetings, instructorLabels, config],
  );
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchTimetableEntries(entries, deferredQuery, activeDate),
    [entries, deferredQuery, activeDate],
  );
  const visibleSeries = useMemo(() => results.slice(0, 50), [results]);
  const resolveSeriesEntry = useMemo(() => {
    const cache = new Map<(typeof entries)[number], (typeof entries)[number]>();
    return (entry: (typeof entries)[number]) => {
      const cached = cache.get(entry);
      if (cached) return cached;
      const base = buildTimetableSeriesEntry(entry, config, instructorLabels);
      cache.set(entry, base);
      return base;
    };
  }, [config, instructorLabels]);
  const visibleResults = useMemo(
    () =>
      visibleSeries.flatMap((result) => {
        const baseEntry = result.isSeries
          ? resolveSeriesEntry(result.entry)
          : result.entry;
        return [
          {
            ...baseEntry,
            navigationMeeting: result.entry.meeting,
            key: result.key,
            series: result.isSeries ? result : null,
            nested: false,
            parentEntry: null,
          },
          ...(expandedSeries === result.key && result.isSeries
            ? result.occurrences.map((entry) => ({
                ...entry,
                navigationMeeting: entry.meeting,
                key: `${result.key}:${entry.meeting.instance_id}`,
                series: null,
                nested: true,
                parentEntry: baseEntry,
              }))
            : []),
        ];
      }),
    [visibleSeries, expandedSeries, resolveSeriesEntry],
  );
  const isOpen = open && Boolean(query.trim());
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.max(0, Math.min(384, availableHeight))}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  const activeIndex = Math.max(
    0,
    Math.min(highlightedIndex, visibleResults.length - 1),
  );

  function handleToggleDates(key: string) {
    setExpandedSeries(expandedSeries === key ? null : key);
    setHighlightedIndex(
      visibleSeries.findIndex((result) => result.key === key),
    );
    inputRef.current?.focus({ preventScroll: true });
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      inputRef.current?.focus();
      setOpen(false);
      return;
    }
    if (!isOpen || !visibleResults.length) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const row = visibleResults[activeIndex];
      if (
        event.key === "ArrowRight" &&
        row.series &&
        expandedSeries !== row.series.key
      )
        handleToggleDates(row.series.key);
      if (event.key === "ArrowLeft") {
        const key = row.nested ? expandedSeries : row.key;
        setExpandedSeries(null);
        setHighlightedIndex(
          visibleSeries.findIndex((result) => result.key === key),
        );
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(visibleResults[activeIndex].navigationMeeting);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Tab"].includes(event.key)) return;
    event.preventDefault();
    const direction =
      event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)
        ? -1
        : 1;
    const nextIndex =
      (activeIndex + direction + visibleResults.length) % visibleResults.length;
    setHighlightedIndex(nextIndex);
    resultRefs.current[nextIndex]?.scrollIntoView({ block: "nearest" });
    // Keep typing available while navigating suggestions.
    inputRef.current?.focus({ preventScroll: true });
  }

  function handleSelect(meeting: Meeting) {
    setOpen(false);
    setQuery("");
    onSelect(meeting);
  }

  return (
    <>
      <label
        ref={refs.setReference}
        className="input input-bordered input-sm flex h-9 w-full shrink-0 items-center gap-2 px-2"
        {...getReferenceProps({
          onBlur(event) {
            if (
              event.currentTarget.contains(event.relatedTarget) ||
              refs.floating.current?.contains(event.relatedTarget)
            )
              return;
            setOpen(false);
          },
        })}
      >
        <span className="icon-[material-symbols--search-rounded] text-base-content/45 text-xl" />
        <input
          ref={inputRef}
          type="search"
          className="min-w-0 grow"
          placeholder="Поиск событий…"
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
            setExpandedSeries(null);
            setOpen(true);
          }}
          onKeyDown={handleSearchKeyDown}
        />
      </label>
      {isOpen ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={cn(
              meetingMetadataGridClass,
              "detail border-base-300 bg-base-100 rounded-box [scrollbar-width:thin] overflow-y-auto border p-1 shadow-sm",
            )}
            {...getFloatingProps({
              onBlur(event) {
                if (
                  event.currentTarget.contains(event.relatedTarget) ||
                  refs.domReference.current?.contains(event.relatedTarget)
                )
                  return;
                setOpen(false);
              },
            })}
          >
            {!results.length ? (
              <p className="text-base-content/60 col-span-2 px-3 py-4 text-sm">
                Ничего не найдено
              </p>
            ) : (
              visibleResults.map(
                (
                  {
                    meeting,
                    navigationMeeting,
                    audienceLabel,
                    instructorLabel,
                    weekdayLabel,
                    dateLabel,
                    key,
                    series,
                    nested,
                    parentEntry,
                  },
                  index,
                ) => {
                  const overrides = new Set(meeting.override_fields);
                  const differences = parentEntry
                    ? timetableOccurrenceDifferences(
                        visibleResults[index],
                        parentEntry,
                      )
                    : null;
                  const showTime = !differences || differences.time;
                  const showRoom = !differences || differences.room;
                  const showAudience = !differences || differences.audience;
                  const showInstructor = !differences || differences.instructor;
                  return (
                    <div
                      key={key}
                      className={cn(
                        meetingMetadataSubgridClass,
                        "rounded-md",
                        activeIndex === index &&
                          "bg-primary/12 ring-primary ring-2 ring-inset",
                        nested && "border-base-300 ml-3 border-l pl-1",
                      )}
                      onMouseMove={() => setHighlightedIndex(index)}
                      onFocus={() => setHighlightedIndex(index)}
                    >
                      <button
                        ref={(node) => {
                          resultRefs.current[index] = node;
                        }}
                        type="button"
                        className={cn(
                          meetingMetadataSubgridClass,
                          meetingMetadataTextClass,
                          meetingMetadataCardClass,
                          "w-full gap-y-0.5 rounded-md text-left outline-none",
                        )}
                        onClick={() => handleSelect(navigationMeeting)}
                        onKeyDown={handleSearchKeyDown}
                      >
                        <span
                          className={cn(
                            meetingMetadataTextClass,
                            "col-span-2 min-w-0 font-medium wrap-anywhere",
                            nested &&
                              overrides.has("weekday") &&
                              meetingMetadataOverrideClass,
                          )}
                        >
                          {nested
                            ? `${weekdayLabel}, ${dateLabel}`
                            : `${meeting.course}${meeting.tag ? ` (${meeting.tag})` : ""}`}
                        </span>
                        {showTime ||
                        (showRoom &&
                          (meeting.room ||
                            differences?.room ||
                            overrides.has("room"))) ? (
                          <MeetingMetadataRow
                            left={
                              showTime ? (
                                <MeetingMetadataField
                                  kind="schedule"
                                  weekly={
                                    parseMeetingInstanceId(meeting.instance_id)
                                      ?.kind === "wp"
                                  }
                                  overridden={
                                    !series &&
                                    (overrides.has("time") ||
                                      overrides.has("weekday"))
                                  }
                                >
                                  {!series && !nested
                                    ? dateLabel
                                    : `${weekdayLabel},`}{" "}
                                  {meeting.start}
                                  {meeting.end ? `–${meeting.end}` : ""}
                                </MeetingMetadataField>
                              ) : null
                            }
                            right={
                              showRoom &&
                              (meeting.room ||
                                differences?.room ||
                                overrides.has("room")) ? (
                                <MeetingMetadataField
                                  kind="room"
                                  overridden={!series && overrides.has("room")}
                                >
                                  {meeting.room || "Без локации"}
                                </MeetingMetadataField>
                              ) : null
                            }
                          />
                        ) : null}
                        {(showAudience && audienceLabel) ||
                        (showInstructor &&
                          (instructorLabel ||
                            differences?.instructor ||
                            overrides.has("instructor"))) ? (
                          <MeetingMetadataRow
                            left={
                              showAudience && audienceLabel ? (
                                <MeetingMetadataField kind="audience">
                                  <MeetingMetadataLabels
                                    labels={audienceLabel
                                      .split(",")
                                      .map((label) => label.trim())
                                      .filter(Boolean)}
                                  />
                                </MeetingMetadataField>
                              ) : null
                            }
                            right={
                              showInstructor &&
                              (instructorLabel ||
                                differences?.instructor ||
                                overrides.has("instructor")) ? (
                                <MeetingMetadataField
                                  kind="instructor"
                                  overridden={
                                    !series && overrides.has("instructor")
                                  }
                                >
                                  {instructorLabel || "Без преподавателя"}
                                </MeetingMetadataField>
                              ) : null
                            }
                          />
                        ) : null}
                      </button>
                      {series ? (
                        <button
                          type="button"
                          className="text-base-content/60 hover:text-primary col-span-2 flex items-center gap-1.5 justify-self-start rounded-md px-2 pb-1.5 text-xs transition-colors"
                          title="Показать даты (→), свернуть (←)"
                          onClick={() => handleToggleDates(key)}
                        >
                          <span className="icon-[material-symbols--calendar-month-outline-rounded] text-sm" />
                          {expandedSeries === key
                            ? "Скрыть даты"
                            : "Показать даты"}
                          <span>{series.occurrences.length}</span>
                          <span
                            className={cn(
                              "text-sm",
                              expandedSeries === key
                                ? "icon-[material-symbols--expand-less-rounded]"
                                : "icon-[material-symbols--expand-more-rounded]",
                            )}
                          />
                        </button>
                      ) : null}
                    </div>
                  );
                },
              )
            )}
            {results.length > visibleSeries.length ? (
              <p className="text-base-content/60 col-span-2 px-3 py-2 text-xs">
                Показаны первые 50 из {results.length}. Уточните запрос.
              </p>
            ) : null}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

const personalDayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

function personalDayHeading(date: string) {
  return personalDayFormatter
    .format(new Date(`${date}T12:00:00`))
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function addDaysIso(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localNowTimeHm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isPersonalMeetingPast(meeting: Meeting, today: string, nowHm: string) {
  if (meeting.date < today) return true;
  if (meeting.date > today) return false;
  const end = meeting.end || meeting.start;
  return Boolean(end && end <= nowHm);
}

function PersonalMeetingCard({
  entry,
  courseColors,
  instructorLabels,
  muted = false,
  onSelect,
}: {
  entry: PersonalMeetingEntry;
  courseColors: Record<string, { bg: string; border: string }>;
  instructorLabels: Record<string, string>;
  muted?: boolean;
  onSelect: (meeting: Meeting) => void;
}) {
  const { meeting, roles } = entry;
  const selectionStore = useSelectionStore();
  const colors = colorBySubject(meeting.course, courseColors);
  const timeRange = meeting.end
    ? `${meeting.start}–${meeting.end}`
    : meeting.start;
  const isTeaching = roles.includes("teaching");
  const instructorIds = (
    typeof meeting.instructors === "string"
      ? meeting.instructors
        ? [meeting.instructors]
        : []
      : (meeting.instructors ?? [])
  ).filter(Boolean);
  const room = String(meeting.room || "").trim();
  const title = `${meeting.course}${meeting.tag ? ` (${meeting.tag})` : ""}`;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "border-base-300/80 w-full cursor-pointer rounded-lg border px-2 py-1.5 text-left transition-[filter] hover:brightness-[0.98]",
        muted && "opacity-50 grayscale-[0.45]",
      )}
      style={meetingColorStyle(colors)}
      title={title}
      onClick={() => onSelect(meeting)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(meeting);
      }}
    >
      <div className="text-base-content truncate text-xs leading-snug font-medium">
        {title}
      </div>
      <div className="text-base-content/70 mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[0.6875rem] leading-tight">
        <span className="font-semibold tabular-nums">{timeRange}</span>
        {room ? (
          <>
            <span className="text-base-content/35">·</span>
            <span
              className={personalLinkClass}
              title={room}
              onClick={(event) => {
                event.stopPropagation();
                selectionStore.setSelection({ type: "room", value: room });
              }}
            >
              {room}
            </span>
          </>
        ) : null}
        {!isTeaching
          ? instructorIds.map((id) => {
              const label = resolveInstructorLabel(id, instructorLabels);
              return (
                <span
                  key={id}
                  className="inline-flex min-w-0 items-center gap-x-1.5"
                >
                  <span className="text-base-content/35">·</span>
                  <span
                    className={cn(personalLinkClass, "truncate")}
                    title={label}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectionStore.setSelection({
                        type: "instructor",
                        value: id,
                      });
                    }}
                  >
                    {label}
                  </span>
                </span>
              );
            })
          : null}
      </div>
    </div>
  );
}

function PersonalWeekDays({
  days,
  courseColors,
  instructorLabels,
  today,
  nowHm,
  onNavigateToMeeting,
}: {
  days: ReturnType<typeof listPersonalMeetingsByDay>;
  courseColors: Record<string, { bg: string; border: string }>;
  instructorLabels: Record<string, string>;
  today: string;
  nowHm: string;
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  return (
    <>
      {days.map((day) => {
        const isToday = day.date === today;
        const isPastDay = day.date < today;
        return (
          <div
            key={day.date}
            className={cn("flex flex-col gap-1.5", isPastDay && "opacity-70")}
          >
            <div
              className={cn(
                "text-[0.6875rem] leading-tight font-semibold tracking-wide uppercase",
                isToday
                  ? "text-[#f5a623]"
                  : isPastDay
                    ? "text-base-content/40"
                    : "text-base-content/70",
              )}
            >
              {isToday ? "Сегодня · " : null}
              {personalDayHeading(day.date)}
            </div>
            <ul className="flex flex-col gap-1.5">
              {day.meetings.map((entry) => (
                <li key={entry.meeting.instance_id}>
                  <PersonalMeetingCard
                    entry={entry}
                    courseColors={courseColors}
                    instructorLabels={instructorLabels}
                    muted={isPersonalMeetingPast(entry.meeting, today, nowHm)}
                    onSelect={onNavigateToMeeting}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function PersonalLessonsSection({
  state,
  ownGroups,
  meetings,
  weekStart,
  courseColors,
  config,
  userEmail,
  onNavigateToMeeting,
}: {
  state: PersonalLessonsState;
  ownGroups: PersonalTimetableGroup[];
  meetings: Meeting[];
  weekStart: string;
  courseColors: Record<string, { bg: string; border: string }>;
  config: SchemaScheduleConfig;
  userEmail?: string | null;
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const instructorLabels = useMemo(
    () => buildInstructorLabelById(config),
    [config],
  );
  const groupIds = useMemo(
    () => ownGroups.map((group) => group.groupId),
    [ownGroups],
  );
  const groupLabelsById = useMemo(
    () => new Map(ownGroups.map((group) => [group.groupId, group.label])),
    [ownGroups],
  );
  const instructorId = useMemo(
    () => resolvePersonalInstructorId(config, userEmail),
    [config, userEmail],
  );
  const listOptions = useMemo(
    () => ({
      groupLabelsById,
      instructors: config.instructors,
      instructorId,
    }),
    [groupLabelsById, config.instructors, instructorId],
  );
  const today = todayIsoDate();
  const nowHm = localNowTimeHm();
  const nextWeekStart = useMemo(
    () => (weekStart ? addDaysIso(weekStart, 7) : ""),
    [weekStart],
  );
  const days = useMemo(
    () =>
      state.kind === "ready"
        ? listPersonalMeetingsByDay(meetings, groupIds, weekStart, listOptions)
        : [],
    [state.kind, meetings, groupIds, weekStart, listOptions],
  );
  const nextWeekDays = useMemo(
    () =>
      state.kind === "ready"
        ? listPersonalMeetingsByDay(
            meetings,
            groupIds,
            nextWeekStart,
            listOptions,
          )
        : [],
    [state.kind, meetings, groupIds, nextWeekStart, listOptions],
  );
  const [nextWeekOpen, setNextWeekOpen] = useState(false);
  const weekCount = days.reduce((count, day) => count + day.meetings.length, 0);
  const nextWeekCount = nextWeekDays.reduce(
    (count, day) => count + day.meetings.length,
    0,
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="flex shrink-0 items-baseline justify-between gap-2 text-sm font-semibold">
        <span>Ваши занятия</span>
        {state.kind === "ready" ? (
          <span className="text-base-content/45 text-xs font-medium tabular-nums">
            {weekCount}
          </span>
        ) : null}
      </h3>
      {state.kind === "guest" ? (
        <div className="flex flex-col gap-2">
          <p className="text-base-content/65 text-sm leading-relaxed">
            Войдите, чтобы подсветить свои группы.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost self-start"
            onClick={state.onSignIn}
          >
            Войти
          </button>
        </div>
      ) : state.kind === "pending" ? (
        <div className="flex flex-col gap-1.5">
          <span className="skeleton h-10 w-full" />
          <span className="skeleton h-10 w-full" />
        </div>
      ) : state.kind === "error" ? (
        <div className="flex flex-col gap-2">
          <p className="text-error text-sm leading-relaxed">
            Не удалось загрузить ваши группы: {state.message}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost self-start"
            onClick={state.onRetry}
          >
            Повторить
          </button>
        </div>
      ) : state.kind === "empty" ? (
        <p className="text-base-content/65 text-sm leading-relaxed">
          Ваши группы и занятия преподавателя пока не найдены. Можно
          просматривать всё расписание.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 [scrollbar-width:thin] flex-col gap-3 overflow-y-auto">
          {ownGroups.length || instructorId ? (
            <div className="flex flex-col gap-1">
              {ownGroups.length ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  <span className="text-base-content/45 text-[0.625rem] font-semibold tracking-wide uppercase">
                    Группы
                  </span>
                  {ownGroups.map((group) => (
                    <span
                      key={group.groupId}
                      className="bg-base-200 text-base-content/80 rounded px-1.5 py-0.5 text-[0.625rem] leading-tight font-medium"
                      title={`${group.sectionCode} · ${group.programCode}`}
                    >
                      {group.label}
                    </span>
                  ))}
                </div>
              ) : null}
              {instructorId ? (
                <div className="text-base-content/55 text-[0.625rem] leading-tight">
                  <span className="font-semibold text-[#7c3aed]">Веду</span>
                  <span className="text-base-content/35"> · </span>
                  занятия, где вы преподаватель
                </div>
              ) : null}
            </div>
          ) : null}
          {!days.length ? (
            <p className="text-base-content/65 text-sm leading-relaxed">
              На этой неделе занятий нет.
            </p>
          ) : (
            <PersonalWeekDays
              days={days}
              courseColors={courseColors}
              instructorLabels={instructorLabels}
              today={today}
              nowHm={nowHm}
              onNavigateToMeeting={onNavigateToMeeting}
            />
          )}
          <button
            type="button"
            className="text-base-content/75 hover:text-base-content inline-flex items-center gap-1 self-start text-xs font-medium"
            onClick={() => setNextWeekOpen((open) => !open)}
          >
            <span
              className={cn(
                "icon-[material-symbols--expand-more-rounded] text-base transition-transform",
                nextWeekOpen && "rotate-180",
              )}
            />
            Следующая неделя
            {nextWeekCount ? (
              <span className="text-base-content/45 tabular-nums">
                {nextWeekCount}
              </span>
            ) : null}
          </button>
          {nextWeekOpen ? (
            !nextWeekDays.length ? (
              <p className="text-base-content/55 text-sm leading-relaxed">
                На следующей неделе занятий нет.
              </p>
            ) : (
              <PersonalWeekDays
                days={nextWeekDays}
                courseColors={courseColors}
                instructorLabels={instructorLabels}
                today={today}
                nowHm={nowHm}
                onNavigateToMeeting={onNavigateToMeeting}
              />
            )
          ) : null}
        </div>
      )}
    </section>
  );
}

export function TimetableSidebarMenu({
  meetings,
  config,
  onNavigateToMeeting,
  activeDate,
  groups,
  selectedKey,
  onSelectUnarranged,
  onCancelPlace,
  placing = false,
  showUnarranged,
  personalLessons,
  ownGroups = [],
  courseColors = {},
  userEmail,
  sidebarAction,
}: {
  meetings: Meeting[];
  config: SchemaScheduleConfig;
  onNavigateToMeeting: (meeting: Meeting) => void;
  activeDate: string;
  groups: UnarrangedComponentGroup[];
  selectedKey: string | null;
  onSelectUnarranged?: (item: UnarrangedLessonItem) => void;
  onCancelPlace?: () => void;
  placing?: boolean;
  showUnarranged: boolean;
  personalLessons?: PersonalLessonsState;
  ownGroups?: PersonalTimetableGroup[];
  courseColors?: Record<string, { bg: string; border: string }>;
  userEmail?: string | null;
  sidebarAction?: "composer" | "student";
}) {
  const [page, setPage] = useState<"menu" | "unarranged">("menu");
  const canShowUnarranged =
    showUnarranged && onSelectUnarranged && onCancelPlace;

  if (page === "unarranged" && canShowUnarranged) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          disabled={placing}
          onClick={() => {
            onCancelPlace();
            setPage("menu");
          }}
        >
          <span className="icon-[material-symbols--arrow-back-rounded] text-lg" />
          Меню
        </button>
        <UnarrangedLessonsPanel
          groups={groups}
          selectedKey={selectedKey}
          onSelect={onSelectUnarranged}
          onCancel={onCancelPlace}
          placing={placing}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="text-lg font-semibold">Меню</h2>
      <TimetableEventSearch
        meetings={meetings}
        config={config}
        onSelect={onNavigateToMeeting}
        activeDate={activeDate}
      />
      {personalLessons ? (
        <PersonalLessonsSection
          state={personalLessons}
          ownGroups={ownGroups}
          meetings={meetings}
          weekStart={activeDate}
          courseColors={courseColors}
          config={config}
          userEmail={userEmail}
          onNavigateToMeeting={onNavigateToMeeting}
        />
      ) : null}
      {canShowUnarranged ? (
        <button
          type="button"
          className={cn(
            "btn btn-ghost h-auto min-h-12 w-full justify-start gap-2 px-3 py-3 text-left normal-case",
            selectedKey && "bg-primary/5",
          )}
          onClick={() => setPage("unarranged")}
        >
          <span className="icon-[material-symbols--playlist-add-check-rounded] shrink-0 text-xl" />
          <span className="flex-1">Неразмещённые</span>
          <span className="text-base-content/60 tabular-nums">
            {countUnarrangedSessions(groups)}
          </span>
          <span className="icon-[material-symbols--chevron-right-rounded] shrink-0 text-xl" />
        </button>
      ) : null}
      {sidebarAction === "composer" ? (
        <Link
          to="/schedule-assistant"
          className="btn btn-ghost mt-auto h-auto min-h-12 w-full shrink-0 justify-start gap-2 px-3 py-3 text-left normal-case"
        >
          <span className="icon-[mdi--calendar-edit-outline] shrink-0 text-xl" />
          <span className="flex-1">Составление расписания</span>
          <span className="icon-[material-symbols--chevron-right-rounded] shrink-0 text-xl" />
        </Link>
      ) : null}
      {sidebarAction === "student" ? (
        <Link
          to="/timetable"
          className="btn btn-ghost mt-auto h-auto min-h-12 w-full shrink-0 justify-start gap-2 px-3 py-3 text-left normal-case"
        >
          <span className="icon-[mdi--account-school-outline] shrink-0 text-xl" />
          <span className="flex-1">Посмотреть как студент</span>
          <span className="icon-[material-symbols--chevron-right-rounded] shrink-0 text-xl" />
        </Link>
      ) : null}
    </div>
  );
}
