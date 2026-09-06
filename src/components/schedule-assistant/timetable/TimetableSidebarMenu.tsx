import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
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
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { UnarrangedLessonsPanel } from "./UnarrangedLessonsPanel.tsx";
import {
  countUnarrangedSessions,
  type UnarrangedComponentGroup,
  type UnarrangedLessonItem,
} from "./unarrangedLessons.ts";
import {
  buildInstructorLabelById,
  type Meeting,
} from "./timetableViewerModel.ts";

import {
  buildTimetableSearchEntries,
  searchTimetableEntries,
} from "./timetableSearch.ts";

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
  const results = useMemo(
    () => searchTimetableEntries(entries, query, activeDate),
    [entries, query, activeDate],
  );
  const visibleSeries = results.slice(0, 50);
  const visibleResults = visibleSeries.flatMap((result) => [
    {
      ...result.entry,
      key: result.key,
      series: result.isSeries ? result : null,
      nested: false,
      parentEntry: null,
    },
    ...(expandedSeries === result.key && result.isSeries
      ? result.occurrences.map((entry) => ({
          ...entry,
          key: `${result.key}:${entry.meeting.instance_id}`,
          series: null,
          nested: true,
          parentEntry: result.entry,
        }))
      : []),
  ]);
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
      handleSelect(visibleResults[activeIndex].meeting);
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
            className="detail border-base-300 bg-base-100 rounded-box [scrollbar-width:thin] overflow-y-auto border p-1 shadow-sm"
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
              <p className="text-base-content/60 px-3 py-4 text-sm">
                Ничего не найдено
              </p>
            ) : (
              visibleResults.map(
                (
                  {
                    meeting,
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
                  const overrideClass =
                    "underline decoration-sky-400 decoration-wavy decoration-1 underline-offset-2";
                  const showTime =
                    !parentEntry ||
                    overrides.has("time") ||
                    overrides.has("weekday") ||
                    meeting.start !== parentEntry.meeting.start ||
                    meeting.end !== parentEntry.meeting.end ||
                    weekdayLabel !== parentEntry.weekdayLabel;
                  const showRoom =
                    !parentEntry ||
                    overrides.has("room") ||
                    meeting.room !== parentEntry.meeting.room;
                  const showAudience =
                    !parentEntry || audienceLabel !== parentEntry.audienceLabel;
                  const showInstructor =
                    !parentEntry ||
                    overrides.has("instructor") ||
                    instructorLabel !== parentEntry.instructorLabel;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex flex-col rounded-md",
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
                        className="flex w-full min-w-0 flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm outline-none"
                        onClick={() => handleSelect(meeting)}
                        onKeyDown={handleSearchKeyDown}
                      >
                        <span
                          className={cn(
                            "text-sm font-medium",
                            nested && overrides.has("weekday") && overrideClass,
                          )}
                        >
                          {nested
                            ? dateLabel
                            : `${meeting.course}${meeting.tag ? ` (${meeting.tag})` : ""}`}
                        </span>
                        {showTime ||
                        (showRoom &&
                          (meeting.room || overrides.has("room"))) ? (
                          <span className="text-base-content/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {showTime ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="icon-[material-symbols--schedule-outline-rounded] text-base-content/45 shrink-0 text-sm" />
                                <span
                                  className={cn(
                                    "font-medium tabular-nums",
                                    !series &&
                                      (overrides.has("time") ||
                                        overrides.has("weekday")) &&
                                      overrideClass,
                                  )}
                                >
                                  {!series && !nested
                                    ? dateLabel
                                    : weekdayLabel}{" "}
                                  {meeting.start}
                                  {meeting.end ? `–${meeting.end}` : ""}
                                </span>
                              </span>
                            ) : null}
                            {showRoom &&
                            (meeting.room || overrides.has("room")) ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="icon-[material-symbols--location-on-outline-rounded] text-base-content/45 shrink-0 text-sm" />
                                <span
                                  className={cn(
                                    !series &&
                                      overrides.has("room") &&
                                      overrideClass,
                                  )}
                                >
                                  {meeting.room || "Без локации"}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                        {(showAudience && audienceLabel) ||
                        (showInstructor &&
                          (instructorLabel || overrides.has("instructor"))) ? (
                          <span className="text-base-content/80 text-xs leading-snug">
                            {showAudience && audienceLabel ? (
                              <span>
                                <span className="icon-[material-symbols--groups-outline-rounded] text-base-content/45 mr-1 inline-block align-[-0.125em] text-sm" />
                                {audienceLabel}
                              </span>
                            ) : null}
                            {showAudience &&
                            audienceLabel &&
                            showInstructor &&
                            (instructorLabel || overrides.has("instructor")) ? (
                              <span className="inline-block w-2" />
                            ) : null}
                            {showInstructor &&
                            (instructorLabel || overrides.has("instructor")) ? (
                              <span>
                                <span className="icon-[material-symbols--person-outline-rounded] text-base-content/45 mr-1 inline-block align-[-0.125em] text-sm" />
                                <span
                                  className={cn(
                                    !series &&
                                      overrides.has("instructor") &&
                                      overrideClass,
                                  )}
                                >
                                  {instructorLabel || "Без преподавателя"}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </button>
                      {series ? (
                        <button
                          type="button"
                          className="text-base-content/60 hover:text-primary flex items-center gap-1.5 self-start rounded-md px-2 pb-1.5 text-xs transition-colors"
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
              <p className="text-base-content/60 px-3 py-2 text-xs">
                Показаны первые 50 из {results.length}. Уточните запрос.
              </p>
            ) : null}
          </div>
        </FloatingPortal>
      ) : null}
    </>
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
    </div>
  );
}
