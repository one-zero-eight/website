import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { scheduleAssistantFetch } from "@/api/schedule-assistant";
import {
  SchemaScheduleConfig,
  Weekday,
} from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { ReturnToChecksLink } from "@/components/schedule-assistant/checks/ReturnToChecksLink.tsx";
import {
  getScheduleSections,
  useConfig,
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import clsx from "clsx";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { CreateClassModal } from "./CreateClassModal.tsx";
import {
  dateForWeekdayInWeekRange,
  type CreateMeetingCellContext,
} from "./createMeetingUtils.ts";
import { EditClassModal } from "./EditClassModal.tsx";
import {
  canRestoreMeeting,
  parseMeetingInstanceId,
  restoreMeetingInCourse,
} from "./meetingEditUtils.ts";
import { MeetingOverrideFieldBadge } from "./meetingOverrideIndicator.tsx";
import {
  programSlotLabelForTermRow,
  resolveProgramTimeColumns,
} from "./programTimeSlots.ts";
import { computeDetailPanel } from "./scheduleAssistantDetailPanel.tsx";
import {
  buildCalendarGrid,
  formatCalendarWeekRange,
} from "./timetableCalendarModel.ts";
import { TimetableCalendarTable } from "./TimetableCalendarTable.tsx";
import {
  GROUPS_CELL_PAD,
  GROUPS_COL_PX,
  GROUPS_COL_WIDTH,
  GROUPS_DAY_ROW_INNER_CLASS,
  GROUPS_DAY_ROW_STICKY_STYLE,
  GROUPS_GRID_HEADER_HEIGHT_DEFAULT,
  GROUPS_HEAD_PAD,
  GROUPS_MEETING_BODY_CLASS,
  GROUPS_MEETING_CLASS,
  GROUPS_MEETING_FOOTER_CLASS,
  GROUPS_MEETING_LINE_CLASS,
  GROUPS_MEETING_TITLE_CLASS,
  GROUPS_SLOT_ROW_CLASS,
  GROUPS_SLOT_TIME_PAD,
  GROUPS_TABLE_CLASS,
  GROUPS_TABLE_HEAD_CLASS,
  GROUPS_TIME_COL_PX,
  GROUPS_TIME_COL_WIDTH,
} from "./timetableGroupsGridLayout.ts";
import {
  TimetableLayoutSelector,
  type TimetableLayoutMode,
} from "./TimetableLayoutSelector.tsx";
import { scrollMeetingIntoCenter } from "./timetableMeetingScroll.ts";
import {
  isTodayWeekdayInDisplayedWeek,
  todayGroupsDayRowClass,
  todayGroupsSlotCellClass,
  todayGroupsSlotTimeClass,
} from "./timetableTodayHighlight.ts";
import {
  WEEK_RELATIVE_BADGE_CLASS,
  WEEK_RELATIVE_LABELS,
  buildColumns,
  buildCourseColors,
  buildCoursesToSections,
  buildGrid,
  buildGroupSizeMap,
  buildInstructorLabelById,
  buildMeetings,
  buildRoomCapacityMap,
  buildWeeks,
  cellSignature,
  colorBySubject,
  columnsForTab,
  dayKey as dayKeyFromModel,
  instructorDetailTooltip,
  meetingRoomLoadLabel,
  meetingRoomLoadOverCapacity,
  meetingSelectionKey,
  mergedMeetingsForCell,
  resolveInstructorLabel,
  roomFillPercent,
  scheduleAssistantDetailTooltips,
  todayIsoDate,
  weekIndexForDate,
  weekRelativeToToday,
  weekdayLabelRu,
  type BuiltGrid,
  type Column,
  type Meeting,
  type MergedRow,
  type Selection,
  type WeekRange,
  type WeekRelativePosition,
} from "./timetableViewerModel.ts";

type InnerTab = "instructor" | "room" | string;

type SelectionStore = {
  subscribe: (cb: () => void) => () => void;
  getSelection: () => Selection;
  setSelection: (next: Selection) => void;
};

function createSelectionStore(): SelectionStore {
  let selection: Selection = null;
  const listeners = new Set<() => void>();
  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSelection() {
      return selection;
    },
    setSelection(next) {
      if (selection === next) return;
      if (
        selection?.type === next?.type &&
        selection?.value === next?.value &&
        (selection?.type !== "meeting" ||
          selection.course === (next as { course?: string })?.course)
      ) {
        return;
      }
      selection = next;
      listeners.forEach((l) => l());
    },
  };
}

const SelectionStoreContext = createContext<SelectionStore | null>(null);

function useSelectionStore(): SelectionStore {
  const ctx = useContext(SelectionStoreContext);
  if (!ctx) throw new Error("SelectionStoreContext is missing");
  return ctx;
}

function useSelectionSnapshot(): Selection {
  const store = useSelectionStore();
  return useSyncExternalStore(store.subscribe, store.getSelection, () => null);
}

function useProgramSelected(yearLabel: string): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return sel?.type === "program" && sel.value === yearLabel;
    },
    () => false,
  );
}

function useGroupHeaderHighlight(groupId: string, yearLabel: string): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return (
        (sel?.type === "group" && sel.value === groupId) ||
        (sel?.type === "program" && sel.value === yearLabel)
      );
    },
    () => false,
  );
}

function useResourceHeaderSelected(
  type: "room" | "instructor",
  resourceKey: string,
): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return sel?.type === type && sel.value === resourceKey;
    },
    () => false,
  );
}

function useMeetingHighlightBits(m: Meeting): number {
  const store = useSelectionStore();
  const courseTitle = String(m.course || "").trim() || "—";
  const key = meetingSelectionKey(m);
  const course = m.course || courseTitle;
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      if (sel?.type !== "meeting") return 0;
      const selected = sel.value === key ? 1 : 0;
      const related = sel.course === course ? 2 : 0;
      return selected | related;
    },
    () => 0,
  );
}

type MeetingCardProps = {
  row: MergedRow;
  grid: BuiltGrid;
  span?: number;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  instructorLabelById: Record<string, string>;
};

function meetingCardPropsEqual(
  prev: MeetingCardProps,
  next: MeetingCardProps,
): boolean {
  if ((prev.span ?? 1) !== (next.span ?? 1)) return false;
  if (prev.row.sign !== next.row.sign || prev.row.count !== next.row.count)
    return false;
  const pm = prev.row.sample;
  const nm = next.row.sample;
  if (
    pm.instance_id !== nm.instance_id ||
    pm.course !== nm.course ||
    pm.tag !== nm.tag ||
    pm.room !== nm.room ||
    pm.start !== nm.start ||
    pm.end !== nm.end ||
    pm.off_grid !== nm.off_grid ||
    pm.off_grid_offset_minutes !== nm.off_grid_offset_minutes ||
    pm.date !== nm.date ||
    (pm.override_fields?.join("\0") ?? "") !==
      (nm.override_fields?.join("\0") ?? "") ||
    ((typeof pm.instructors === "string"
      ? [pm.instructors]
      : pm.instructors
    )?.join("\0") ?? "") !==
      ((typeof nm.instructors === "string"
        ? [nm.instructors]
        : nm.instructors
      )?.join("\0") ?? "")
  ) {
    return false;
  }
  if (prev.grid !== next.grid) return false;
  if (prev.courseColors !== next.courseColors) return false;
  if (prev.roomCapacityById !== next.roomCapacityById) return false;
  if (prev.groupSizeById !== next.groupSizeById) return false;
  if (prev.instructorLabelById !== next.instructorLabelById) return false;
  if (prev.selectMeeting !== next.selectMeeting) return false;
  if (prev.selectInstructorCell !== next.selectInstructorCell) return false;
  if (prev.selectRoomCell !== next.selectRoomCell) return false;
  return true;
}

type UtilizationMeetingCardProps = MeetingCardProps & {
  mode: "instructor" | "room";
};

function utilizationMeetingCardPropsEqual(
  prev: UtilizationMeetingCardProps,
  next: UtilizationMeetingCardProps,
): boolean {
  if (prev.mode !== next.mode) return false;
  return meetingCardPropsEqual(prev, next);
}

function TimetableWorkspaceInner({
  focusMeetingId,
  onFocusMeetingHandled,
  returnFromChecks,
}: {
  focusMeetingId?: string;
  onFocusMeetingHandled?: () => void;
  returnFromChecks?: boolean;
}) {
  const { config } = useConfig();
  const { showError } = useToast();
  const [msg, setMsg] = useState("");
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [columns, setColumns] = useState<Column[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [courseColors, setCourseColors] = useState<
    Record<string, { bg: string; border: string }>
  >({});
  const [activeTab, setActiveTab] = useState<InnerTab>("core");
  const [layoutMode, setLayoutMode] = useState<TimetableLayoutMode>("groups");
  const [exportPending, setExportPending] = useState(false);
  const [roomCapacityById, setRoomCapacityById] = useState<
    Record<string, number>
  >({});
  const [groupSizeById, setGroupSizeById] = useState<
    Record<string, number | null | undefined>
  >({});
  const instructorLabelById = useMemo(
    () => (config ? buildInstructorLabelById(config) : {}),
    [config],
  );
  const [isMiddleDragScrolling, setIsMiddleDragScrolling] = useState(false);
  const [scrollToMeetingId, setScrollToMeetingId] = useState<string | null>(
    null,
  );
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const dragScrollStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    horizontalScrollEl: HTMLElement;
  } | null>(null);
  const activeWeekStartRef = useRef<string | null>(null);
  const appliedFocusMeetingIdRef = useRef<string | null>(null);

  const selectionStore = useMemo(() => createSelectionStore(), []);

  const coursesToSections = useMemo(
    () => config && buildCoursesToSections(config),
    [config],
  );

  useEffect(() => {
    if (!config) return;
    const sections = getScheduleSections(config);
    const sectionCodes = sections.map((section) => section.code);
    if (!sectionCodes.length) return;
    const validTabs = new Set<InnerTab>([
      ...sectionCodes,
      "instructor",
      "room",
    ]);
    setActiveTab((current) => {
      const next = validTabs.has(current)
        ? current
        : (sectionCodes[0] as InnerTab);
      if (next !== "instructor" && next !== "room") {
        const section = sections.find((candidate) => candidate.code === next);
        const defaultLayout = section?.default_layout;
        if (defaultLayout === "groups" || defaultLayout === "calendar") {
          setLayoutMode(defaultLayout);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.term?.sections]);

  const isUtilizationTab = activeTab === "instructor" || activeTab === "room";

  const handleExportXlsx = useCallback(async () => {
    if (isUtilizationTab || exportPending) return;
    setExportPending(true);
    try {
      const {
        data,
        error: downloadError,
        response,
      } = await scheduleAssistantFetch.GET("/schedule/export.xlsx", {
        parseAs: "blob",
      });
      if (downloadError || !data) {
        throw (
          downloadError ?? new Error("Не удалось экспортировать расписание")
        );
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
      const asciiMatch = /filename="([^"]+)"/i.exec(disposition);
      const termLabel = String(config?.term?.name || "").trim();
      const fallbackName = termLabel ? `${termLabel}.xlsx` : "Schedule.xlsx";
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1]!)
        : asciiMatch?.[1] || fallbackName;
      const blob = data as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError("Ошибка экспорта", formatApiErrorMessage(e));
    } finally {
      setExportPending(false);
    }
  }, [config, exportPending, isUtilizationTab, showError]);

  useEffect(() => {
    if (isUtilizationTab && layoutMode === "calendar") {
      setLayoutMode("groups");
    }
  }, [isUtilizationTab, layoutMode]);

  useEffect(() => {
    activeWeekStartRef.current = weeks[weekIndex]?.start ?? null;
  }, [weeks, weekIndex]);

  useEffect(() => {
    if (!config || !coursesToSections) {
      setAllMeetings([]);
      setColumns([]);
      setWeeks([]);
      setWeekIndex(0);
      activeWeekStartRef.current = null;
      setMsg("");
      return;
    }
    try {
      const meetings = buildMeetings(config, coursesToSections);
      if (!meetings.length)
        throw new Error("В config.yaml не найдено занятий.");
      if (!config.term)
        throw new Error(
          "config.yaml не похож на конфиг расписания (нет term).",
        );
      const cols = buildColumns(config);
      if (!cols.length)
        throw new Error("Не удалось построить колонки групп из config.");

      setAllMeetings(meetings);
      setRoomCapacityById(buildRoomCapacityMap(config));
      setGroupSizeById(buildGroupSizeMap(config));
      setCourseColors(buildCourseColors(meetings));
      selectionStore.setSelection(null);
      setColumns(cols);
      const nextWeeks = buildWeeks(meetings);
      setWeeks(nextWeeks);
      setWeekIndex((currentIndex) => {
        const preservedStart = activeWeekStartRef.current;
        if (preservedStart) {
          const preservedIndex = nextWeeks.findIndex(
            (week) => week.start === preservedStart,
          );
          if (preservedIndex >= 0) return preservedIndex;
        }
        if (!nextWeeks.length) return 0;
        if (!preservedStart) {
          return weekIndexForDate(nextWeeks, todayIsoDate());
        }
        return Math.min(currentIndex, nextWeeks.length - 1);
      });
      setMsg("");
    } catch (e: unknown) {
      setMsg(String((e as Error)?.message || e));
    }
  }, [config, coursesToSections, selectionStore]);

  useEffect(() => {
    function handleGlobalEsc(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        active.blur();
        event.preventDefault();
        return;
      }
      selectionStore.setSelection(null);
    }

    window.addEventListener("keydown", handleGlobalEsc);
    return () => window.removeEventListener("keydown", handleGlobalEsc);
  }, [selectionStore]);

  useEffect(() => {
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const targetWrap = wrap;

    function calendarDaysScrollEl() {
      return targetWrap.querySelector<HTMLElement>("#calendar-days-scroll");
    }

    function horizontalScrollEl() {
      return calendarDaysScrollEl() ?? targetWrap;
    }

    function handleWrapMouseDown(event: MouseEvent) {
      if (event.button !== 1) return;
      event.preventDefault();
      dragScrollStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: horizontalScrollEl().scrollLeft,
        startScrollTop: targetWrap.scrollTop,
        horizontalScrollEl: horizontalScrollEl(),
      };
      setIsMiddleDragScrolling(true);
    }

    targetWrap.addEventListener("mousedown", handleWrapMouseDown, {
      capture: true,
      passive: false,
    });

    return () => {
      targetWrap.removeEventListener("mousedown", handleWrapMouseDown, {
        capture: true,
      });
    };
  }, []);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const dragState = dragScrollStateRef.current;
      const wrap = gridWrapRef.current;
      if (!dragState || !wrap) return;
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      dragState.horizontalScrollEl.scrollLeft = dragState.startScrollLeft - dx;
      wrap.scrollTop = dragState.startScrollTop - dy;
    }

    function handleMouseUp() {
      if (!dragScrollStateRef.current) return;
      dragScrollStateRef.current = null;
      setIsMiddleDragScrolling(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const grid: BuiltGrid | null = useMemo(() => {
    if (!config || !weeks.length) return null;
    const wk = weeks[weekIndex];
    if (!wk) return null;
    const visibleColumns = columnsForTab(
      activeTab,
      columns,
      allMeetings,
      config,
    );
    return buildGrid(config, allMeetings, wk.start, activeTab, visibleColumns);
  }, [config, allMeetings, weeks, weekIndex, activeTab, columns]);

  const calendarGrid = useMemo(() => {
    if (!config || !allMeetings.length || !weeks.length) return null;
    return buildCalendarGrid(config, allMeetings, weeks, activeTab);
  }, [config, allMeetings, weeks, activeTab]);

  useLayoutEffect(() => {
    if (layoutMode === "calendar") return;

    const wrap = gridWrapRef.current;
    if (!wrap) return;

    const syncGridHeaderHeight = () => {
      const thead = wrap.querySelector<HTMLElement>("#table thead");
      if (!thead) return;
      const height = thead.offsetHeight;
      if (height <= 0) return;
      wrap.style.setProperty("--sa-grid-header-height", `${height}px`);
    };

    syncGridHeaderHeight();
    const rafId = requestAnimationFrame(syncGridHeaderHeight);

    const thead = wrap.querySelector<HTMLElement>("#table thead");
    const observer = thead ? new ResizeObserver(syncGridHeaderHeight) : null;
    if (thead) observer?.observe(thead);
    window.addEventListener("resize", syncGridHeaderHeight);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener("resize", syncGridHeaderHeight);
    };
  }, [
    layoutMode,
    activeTab,
    columns,
    grid,
    allMeetings,
    weeks,
    weekIndex,
    isUtilizationTab,
  ]);

  useEffect(() => {
    if (layoutMode !== "calendar" || !calendarGrid) return;
    const currentWeekRow = gridWrapRef.current?.querySelector(
      "[data-current-week]",
    );
    currentWeekRow?.scrollIntoView({ block: "start" });
  }, [layoutMode, calendarGrid]);

  const applyTabChange = useCallback(
    (nextTab: InnerTab) => {
      setActiveTab(nextTab);
      selectionStore.setSelection(null);
      if (nextTab === "instructor" || nextTab === "room") {
        setLayoutMode("groups");
        return;
      }
      const section = getScheduleSections(config).find(
        (candidate) => candidate.code === nextTab,
      );
      const defaultLayout = section?.default_layout;
      if (defaultLayout === "groups" || defaultLayout === "calendar") {
        setLayoutMode(defaultLayout);
      }
    },
    [config, selectionStore],
  );

  const selectMeeting = useCallback(
    (valueKey: string, course: string) => {
      selectionStore.setSelection({ type: "meeting", value: valueKey, course });
    },
    [selectionStore],
  );

  const selectInstructorCell = useCallback(
    (name: string) => {
      selectionStore.setSelection({ type: "instructor", value: name });
    },
    [selectionStore],
  );

  const selectRoomCell = useCallback(
    (room: string) => {
      selectionStore.setSelection({ type: "room", value: room });
    },
    [selectionStore],
  );

  const selectProgram = useCallback(
    (yearLabel: string) => {
      selectionStore.setSelection({ type: "program", value: yearLabel });
    },
    [selectionStore],
  );

  const selectGroup = useCallback(
    (groupId: string) => {
      selectionStore.setSelection({ type: "group", value: groupId });
    },
    [selectionStore],
  );

  const selectInstructorHeader = useCallback(
    (name: string) => {
      selectionStore.setSelection({ type: "instructor", value: name });
    },
    [selectionStore],
  );

  const selectRoomHeader = useCallback(
    (room: string) => {
      selectionStore.setSelection({ type: "room", value: room });
    },
    [selectionStore],
  );

  const clearSelection = useCallback(() => {
    selectionStore.setSelection(null);
  }, [selectionStore]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createCellContext, setCreateCellContext] =
    useState<CreateMeetingCellContext | null>(null);

  const handleEmptyCellClick = useCallback(
    (context: CreateMeetingCellContext) => {
      setCreateCellContext(context);
      setCreateModalOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!focusMeetingId) {
      appliedFocusMeetingIdRef.current = null;
      return;
    }
    if (!allMeetings.length || !weeks.length) return;
    if (appliedFocusMeetingIdRef.current === focusMeetingId) return;

    const meeting = allMeetings.find(
      (entry) => entry.instance_id === focusMeetingId,
    );
    if (!meeting) return;

    appliedFocusMeetingIdRef.current = focusMeetingId;
    setWeekIndex(weekIndexForDate(weeks, meeting.date));
    if (meeting.sections[0]) {
      setActiveTab(meeting.sections[0]);
    }
    selectionStore.setSelection({
      type: "meeting",
      value: meeting.instance_id,
      course: meeting.course,
    });
    setScrollToMeetingId(meeting.instance_id);
  }, [allMeetings, focusMeetingId, selectionStore, weeks]);

  useEffect(() => {
    if (!scrollToMeetingId) return;

    let cancelled = false;
    let attempts = 0;

    const tryScroll = () => {
      if (cancelled) return;
      const scrolled = scrollMeetingIntoCenter(
        gridWrapRef.current,
        scrollToMeetingId,
      );
      if (scrolled) {
        setScrollToMeetingId(null);
        onFocusMeetingHandled?.();
        return;
      }
      attempts += 1;
      if (attempts < 12) {
        requestAnimationFrame(tryScroll);
      } else {
        setScrollToMeetingId(null);
        onFocusMeetingHandled?.();
      }
    };

    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [
    scrollToMeetingId,
    grid,
    calendarGrid,
    weekIndex,
    activeTab,
    layoutMode,
    onFocusMeetingHandled,
  ]);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (
        t.closest(".meeting") ||
        t.closest(".year-head") ||
        t.closest(".group-head") ||
        t.closest(".clickable") ||
        t.closest(".detail") ||
        t.closest(".schedule-assistant-toolbar") ||
        t.closest("button") ||
        t.closest("input") ||
        t.closest("select") ||
        t.closest("summary") ||
        t.closest("details")
      ) {
        return;
      }
      selectionStore.setSelection(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [selectionStore]);

  if (!config) {
    return (
      <div className="text-base-content/70 flex h-full items-center justify-center p-4 text-sm">
        Загрузите config.yaml во вкладке «Настройки».
      </div>
    );
  }

  const weekLabel = !weeks.length
    ? "Нет недель"
    : `Нед. ${weekIndex + 1}/${weeks.length}: ${formatCalendarWeekRange(weeks[weekIndex]!.start, weeks[weekIndex]!.end)}`;
  const weekRelative: WeekRelativePosition | null = weeks[weekIndex]
    ? weekRelativeToToday(weeks[weekIndex]!)
    : null;
  const weekRelativeBadgeClass = WEEK_RELATIVE_BADGE_CLASS;

  return (
    <SelectionStoreContext.Provider value={selectionStore}>
      <div className="font-rubik text-base-content flex min-h-0 flex-1 flex-col leading-[1.45] antialiased">
        <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 p-4">
          <div className="grid h-full min-h-0 w-full flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[minmax(0,1fr)]">
            <div className="-mt-2 -ml-4 flex min-h-0 min-w-0 flex-col overflow-hidden">
              {msg ? (
                <div className="alert alert-error alert-soft mx-2 mt-2 shrink-0 py-2 text-sm">
                  {msg}
                </div>
              ) : null}

              <div
                id="tableStage"
                className="rounded-tr-box relative flex min-h-0 flex-1 flex-col overflow-hidden border border-[#d8dfeb] bg-white"
              >
                <div className="schedule-assistant-toolbar flex shrink-0 flex-wrap items-center gap-2 border-b border-[#d8dfeb] px-2 py-1 text-sm">
                  {returnFromChecks ? <ReturnToChecksLink /> : null}
                  {layoutMode !== "calendar" ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="join">
                        <button
                          type="button"
                          className="btn btn-xs join-item min-h-8 min-w-8 px-0"
                          title="Предыдущая неделя"
                          disabled={weekIndex <= 0 || !weeks.length}
                          onClick={() => {
                            if (weekIndex > 0) setWeekIndex((i) => i - 1);
                          }}
                        >
                          ‹
                        </button>
                        <span
                          className="join-item btn btn-xs btn-ghost no-animation text-base-content inline-flex h-auto min-h-8 max-w-[min(100vw-8rem,28rem)] min-w-[10.5rem] cursor-default items-center justify-center px-2 py-1 text-center text-sm leading-tight font-normal whitespace-nowrap normal-case"
                          role="status"
                        >
                          {weekLabel}
                        </span>
                        <button
                          type="button"
                          className="btn btn-xs join-item min-h-8 min-w-8 px-0"
                          title="Следующая неделя"
                          disabled={
                            weekIndex >= weeks.length - 1 || !weeks.length
                          }
                          onClick={() => {
                            if (weekIndex < weeks.length - 1)
                              setWeekIndex((i) => i + 1);
                          }}
                        >
                          ›
                        </button>
                      </div>
                      {weekRelative ? (
                        <span
                          className={clsx(
                            "badge badge-xs shrink-0",
                            weekRelativeBadgeClass[weekRelative],
                          )}
                        >
                          {WEEK_RELATIVE_LABELS[weekRelative]} неделя
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1"
                      title={
                        isUtilizationTab
                          ? "Экспорт недоступен на вкладках преподавателей и аудиторий"
                          : "Экспорт всех разделов в XLSX"
                      }
                      disabled={isUtilizationTab || exportPending || !config}
                      onClick={() => {
                        void handleExportXlsx();
                      }}
                    >
                      {exportPending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <span className="icon-[material-symbols--download-rounded] text-base" />
                      )}
                      Экспорт XLSX
                    </button>
                    <TimetableLayoutSelector
                      layoutMode={layoutMode}
                      onLayoutModeChange={setLayoutMode}
                      calendarDisabled={isUtilizationTab}
                    />
                    <TimetableTabSelector
                      config={config}
                      activeTab={activeTab}
                      onTabChange={applyTabChange}
                    />
                  </div>
                </div>

                <div
                  id="gridWrap"
                  ref={gridWrapRef}
                  className={clsx(
                    "min-h-0 flex-1 overflow-auto overscroll-x-contain bg-white pb-4 [overflow-anchor:none]",
                    isMiddleDragScrolling ? "cursor-grabbing" : "cursor-auto",
                  )}
                  style={
                    {
                      "--sa-time-col-width": "130px",
                      "--sa-grid-header-height":
                        GROUPS_GRID_HEADER_HEIGHT_DEFAULT,
                    } as React.CSSProperties
                  }
                >
                  <TimetableMainGrid
                    layoutMode={layoutMode}
                    isUtilizationTab={isUtilizationTab}
                    calendarGrid={calendarGrid}
                    grid={grid}
                    activeWeek={weeks[weekIndex] ?? null}
                    columns={columns}
                    activeTab={activeTab}
                    allMeetings={allMeetings}
                    config={config}
                    courseColors={courseColors}
                    roomCapacityById={roomCapacityById}
                    groupSizeById={groupSizeById}
                    instructorLabelById={instructorLabelById}
                    selectMeeting={selectMeeting}
                    selectInstructorCell={selectInstructorCell}
                    selectRoomCell={selectRoomCell}
                    selectInstructorHeader={selectInstructorHeader}
                    selectRoomHeader={selectRoomHeader}
                    selectProgram={selectProgram}
                    selectGroup={selectGroup}
                    clearSelection={clearSelection}
                    onEmptyCellClick={
                      isUtilizationTab ? undefined : handleEmptyCellClick
                    }
                  />
                </div>
              </div>
            </div>

            <aside
              className="detail border-base-300 bg-base-100 rounded-box sticky top-4 flex max-h-[calc(100vh-2rem)] min-h-0 w-full flex-col self-start overflow-hidden border p-3 xl:col-start-2 xl:h-[calc(100vh-2rem)]"
              id="detail"
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
                <TimetableDetailPanel
                  allMeetings={allMeetings}
                  columns={columns}
                  config={config}
                  roomCapacityById={roomCapacityById}
                  groupSizeById={groupSizeById}
                  weeks={weeks}
                  weekIndex={weekIndex}
                  clearSelection={clearSelection}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
      <CreateClassModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        cellContext={createCellContext}
        config={config}
        meetings={allMeetings}
      />
    </SelectionStoreContext.Provider>
  );
}

export function TimetableWorkspace({
  focusMeetingId,
  onFocusMeetingHandled,
  returnFromChecks,
}: {
  focusMeetingId?: string;
  onFocusMeetingHandled?: () => void;
  returnFromChecks?: boolean;
} = {}) {
  return (
    <TimetableWorkspaceInner
      focusMeetingId={focusMeetingId}
      onFocusMeetingHandled={onFocusMeetingHandled}
      returnFromChecks={returnFromChecks}
    />
  );
}

function TimetableMainGrid({
  layoutMode,
  isUtilizationTab,
  calendarGrid,
  grid,
  activeWeek,
  columns,
  activeTab,
  allMeetings,
  config,
  courseColors,
  roomCapacityById,
  groupSizeById,
  instructorLabelById,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  selectInstructorHeader,
  selectRoomHeader,
  selectProgram,
  selectGroup,
  clearSelection,
  onEmptyCellClick,
}: {
  layoutMode: TimetableLayoutMode;
  isUtilizationTab: boolean;
  calendarGrid: ReturnType<typeof buildCalendarGrid>;
  grid: BuiltGrid | null;
  activeWeek: WeekRange | null;
  columns: Column[];
  activeTab: InnerTab;
  allMeetings: Meeting[];
  config: SchemaScheduleConfig;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  instructorLabelById: Record<string, string>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectInstructorHeader: (name: string) => void;
  selectRoomHeader: (room: string) => void;
  selectProgram: (yearLabel: string) => void;
  selectGroup: (groupId: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
}) {
  const selection = useSelectionSnapshot();

  if (layoutMode === "calendar" && !isUtilizationTab) {
    if (!calendarGrid) return null;
    return (
      <TimetableCalendarTable
        calendarGrid={calendarGrid}
        courseColors={courseColors}
        selection={selection}
        selectMeeting={selectMeeting}
        clearSelection={clearSelection}
        onEmptyCellClick={onEmptyCellClick}
      />
    );
  }

  if (!grid) return null;

  return (
    <TimetableTable
      key={activeTab}
      tabMode={activeTab}
      grid={grid}
      activeWeek={activeWeek}
      columns={columns}
      allMeetings={allMeetings}
      config={config}
      courseColors={courseColors}
      roomCapacityById={roomCapacityById}
      groupSizeById={groupSizeById}
      instructorLabelById={instructorLabelById}
      selectMeeting={selectMeeting}
      selectInstructorCell={selectInstructorCell}
      selectRoomCell={selectRoomCell}
      selectInstructorHeader={selectInstructorHeader}
      selectRoomHeader={selectRoomHeader}
      selectProgram={selectProgram}
      selectGroup={selectGroup}
      clearSelection={clearSelection}
      onEmptyCellClick={onEmptyCellClick}
    />
  );
}

function TimetableTabSelector({
  config,
  activeTab,
  onTabChange,
}: {
  config: SchemaScheduleConfig;
  activeTab: InnerTab;
  onTabChange: (tab: InnerTab) => void;
}) {
  const sections = getScheduleSections(config);
  const options: { value: InnerTab; label: string }[] = [
    ...sections.map((section) => ({
      value: section.code,
      label: section.name,
    })),
    { value: "instructor", label: "По преподавателям" },
    { value: "room", label: "По аудиториям" },
  ];

  return (
    <SelectDropdown
      value={activeTab}
      onChange={onTabChange}
      options={options}
      placeholder="Режим таблицы"
      triggerClassName="w-[10.5rem]"
      menuClassName="min-w-[12rem]"
      placement="bottom-end"
      matchTriggerWidth={false}
    />
  );
}

type TimetableTableProps = {
  tabMode: InnerTab;
  grid: BuiltGrid;
  activeWeek: WeekRange | null;
  columns: Column[];
  allMeetings: Meeting[];
  config: SchemaScheduleConfig;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  instructorLabelById: Record<string, string>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectInstructorHeader: (name: string) => void;
  selectRoomHeader: (room: string) => void;
  selectProgram: (yearLabel: string) => void;
  selectGroup: (groupId: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
};

function TimetableTable({
  tabMode,
  grid,
  activeWeek,
  columns,
  allMeetings,
  config,
  courseColors,
  roomCapacityById,
  groupSizeById,
  instructorLabelById,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  selectInstructorHeader,
  selectRoomHeader,
  selectProgram,
  selectGroup,
  clearSelection,
  onEmptyCellClick,
}: TimetableTableProps) {
  return (
    <table id="table" className={GROUPS_TABLE_CLASS}>
      {tabMode === "instructor" || tabMode === "room" ? (
        renderUtilizationRows({
          mode: tabMode === "instructor" ? "instructor" : "room",
          grid,
          courseColors,
          roomCapacityById,
          groupSizeById,
          instructorLabelById,
          selectMeeting,
          selectInstructorCell,
          selectRoomCell,
          selectInstructorHeader,
          selectRoomHeader,
        })
      ) : (
        <CoreGroupsTable
          grid={grid}
          activeWeek={activeWeek}
          columns={columns}
          allMeetings={allMeetings}
          config={config}
          activeTab={tabMode}
          courseColors={courseColors}
          roomCapacityById={roomCapacityById}
          groupSizeById={groupSizeById}
          instructorLabelById={instructorLabelById}
          selectMeeting={selectMeeting}
          selectInstructorCell={selectInstructorCell}
          selectRoomCell={selectRoomCell}
          selectProgram={selectProgram}
          selectGroup={selectGroup}
          clearSelection={clearSelection}
          onEmptyCellClick={onEmptyCellClick}
        />
      )}
    </table>
  );
}

type TimetableDetailPanelProps = {
  allMeetings: Meeting[];
  columns: Column[];
  config: SchemaScheduleConfig;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  weeks: WeekRange[];
  weekIndex: number;
  clearSelection: () => void;
};

function timetableDetailPanelPropsEqual(
  prev: TimetableDetailPanelProps,
  next: TimetableDetailPanelProps,
): boolean {
  return (
    prev.allMeetings === next.allMeetings &&
    prev.columns === next.columns &&
    prev.config === next.config &&
    prev.roomCapacityById === next.roomCapacityById &&
    prev.groupSizeById === next.groupSizeById &&
    prev.weeks === next.weeks &&
    prev.weekIndex === next.weekIndex &&
    prev.clearSelection === next.clearSelection
  );
}

const TimetableDetailPanel = memo(function TimetableDetailPanel({
  allMeetings,
  columns,
  config,
  roomCapacityById,
  groupSizeById,
  weeks,
  weekIndex,
  clearSelection,
}: TimetableDetailPanelProps) {
  const selection = useSelectionSnapshot();
  const selectionStore = useSelectionStore();
  const deferredSelection = useDeferredValue(selection);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [restoringMeetingId, setRestoringMeetingId] = useState<string | null>(
    null,
  );
  const { data: courses } = useCoursesQuery();
  const { mutate: updateCourse, isPending: isRestorePending } =
    useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();

  const handleRestoreMeeting = useCallback(
    (meeting: Meeting) => {
      if (!canRestoreMeeting(meeting) || !courses) return;
      const meetingRef = parseMeetingInstanceId(meeting.instance_id);
      if (!meetingRef || meetingRef.kind !== "wp") return;

      const course = courses.find((item) => item.name === meeting.course);
      if (!course) {
        showError("Ошибка", "Курс не найден в конфигурации.");
        return;
      }

      const updatedCourse = restoreMeetingInCourse(course, meetingRef, config);
      if (!updatedCourse) {
        showError("Ошибка", "Не удалось восстановить занятие.");
        return;
      }

      setRestoringMeetingId(meeting.instance_id);
      updateCourse(
        {
          params: { path: { course_name: course.name } },
          body: updatedCourse,
        },
        {
          onSuccess: () => {
            showSuccess(
              "Восстановлено",
              "Занятие снова добавлено в расписание.",
            );
            setRestoringMeetingId(null);
          },
          onError: (error) => {
            showError("Ошибка восстановления", formatApiErrorMessage(error));
            setRestoringMeetingId(null);
          },
        },
      );
    },
    [config, courses, showError, showSuccess, updateCourse],
  );

  const detail = useMemo(
    () =>
      computeDetailPanel({
        selection: deferredSelection,
        allMeetings,
        columns,
        config,
        roomCapacityById,
        groupSizeById,
        weeks,
        weekIndex,
        onRestoreMeeting: handleRestoreMeeting,
        restoringMeetingId: isRestorePending ? restoringMeetingId : null,
      }),
    [
      deferredSelection,
      allMeetings,
      columns,
      config,
      roomCapacityById,
      groupSizeById,
      weeks,
      weekIndex,
      handleRestoreMeeting,
      isRestorePending,
      restoringMeetingId,
    ],
  );

  const onDetailListClick = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      const instEl = t.closest(".instructor-link");
      const roomEl = t.closest(".room-link");
      const groupEl = t.closest(".group-link");
      if (groupEl) {
        ev.stopPropagation();
        const encoded = groupEl.getAttribute("data-group") || "";
        const groupId = decodeURIComponent(encoded);
        if (!groupId) return;
        selectionStore.setSelection({ type: "group", value: groupId });
        return;
      }
      if (instEl) {
        ev.stopPropagation();
        const encoded = instEl.getAttribute("data-inst") || "";
        const instName = decodeURIComponent(encoded);
        if (!instName) return;
        selectionStore.setSelection({ type: "instructor", value: instName });
        return;
      }
      if (roomEl) {
        ev.stopPropagation();
        const encoded = roomEl.getAttribute("data-room") || "";
        const roomName = decodeURIComponent(encoded);
        if (!roomName) return;
        selectionStore.setSelection({ type: "room", value: roomName });
      }
    },
    [selectionStore],
  );

  const selectedMeeting = useMemo(() => {
    if (deferredSelection?.type !== "meeting") return null;
    return (
      allMeetings.find(
        (meeting) => meeting.instance_id === deferredSelection.value,
      ) ?? null
    );
  }, [allMeetings, deferredSelection]);

  const canEditSelectedMeeting = useMemo(() => {
    if (!selectedMeeting) return false;
    return !!parseMeetingInstanceId(selectedMeeting.instance_id);
  }, [selectedMeeting]);

  return (
    <>
      <div className="border-base-300 mb-2 flex flex-col gap-2 border-b pb-2">
        <div
          className="detail-title text-base-content min-w-0 text-lg leading-snug font-semibold [overflow-wrap:anywhere]"
          id="detailTitle"
        >
          {detail.detailTitle}
        </div>
        {!editModalOpen ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {canEditSelectedMeeting ? (
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={() => setEditModalOpen(true)}
              >
                Редактировать
              </button>
            ) : null}
            {deferredSelection ? (
              <button
                className="btn btn-ghost btn-sm shrink-0"
                id="clearSelectionBtn"
                type="button"
                onClick={clearSelection}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {detail.detailSummary ? (
        <div
          className="detail-summary text-base-content/70 mb-3 text-sm leading-snug"
          id="detailSummary"
        >
          {detail.detailSummary}
        </div>
      ) : (
        <div id="detailSummary" className="detail-summary mb-0" />
      )}
      {!detail.histogramHidden ? (
        <div
          id="detailHistogram"
          className="border-base-300 bg-base-200/30 rounded-box mb-3 flex shrink-0 flex-col gap-2 border p-2"
          dangerouslySetInnerHTML={{ __html: detail.histogramHtml }}
        />
      ) : (
        <div
          id="detailHistogram"
          className="my-0 flex shrink-0 flex-col gap-2.5"
          hidden
        />
      )}
      <div
        className="grid min-h-0 flex-1 gap-1 text-sm"
        id="detailList"
        onClick={onDetailListClick}
      >
        {detail.listContent}
      </div>
      <EditClassModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        meeting={selectedMeeting}
        config={config}
        meetings={allMeetings}
      />
    </>
  );
}, timetableDetailPanelPropsEqual);

const CoreYearHeadCell = memo(function CoreYearHeadCell({
  yearLabel,
  colSpan,
  onSelectProgram,
}: {
  yearLabel: string;
  colSpan: number;
  onSelectProgram: (y: string) => void;
}) {
  const programSelected = useProgramSelected(yearLabel);
  return (
    <th
      className={clsx(
        "year-head z-[8] cursor-pointer border-t border-r border-b border-[#d8dfeb] bg-[#1f5fae] text-center align-top font-bold text-white",
        GROUPS_HEAD_PAD,
        programSelected && "shadow-[inset_0_-3px_0_#ffd54f]",
      )}
      colSpan={colSpan}
      data-year-label={yearLabel}
      onClick={() => onSelectProgram(yearLabel)}
    >
      <span
        className="block w-full"
        title={scheduleAssistantDetailTooltips.program}
      >
        {yearLabel}
      </span>
    </th>
  );
});

const CoreGroupHeadCell = memo(function CoreGroupHeadCell({
  groupId,
  groupLabel,
  yearLabel,
  onSelectGroup,
}: {
  groupId: string;
  groupLabel: string;
  yearLabel: string;
  onSelectGroup: (id: string) => void;
}) {
  const highlight = useGroupHeaderHighlight(groupId, yearLabel);
  return (
    <th
      className={clsx(
        "group-head z-[8] cursor-pointer border-r border-b border-[#d8dfeb] bg-[#2d77cc] text-center align-top font-semibold text-white",
        GROUPS_COL_WIDTH,
        GROUPS_HEAD_PAD,
        highlight && "shadow-[inset_0_-3px_0_#ffd54f]",
      )}
      onClick={() => onSelectGroup(groupId)}
    >
      <span
        className="block w-full"
        title={scheduleAssistantDetailTooltips.group}
      >
        {groupLabel}
      </span>
    </th>
  );
});

const UtilResourceHeadCell = memo(function UtilResourceHeadCell({
  resourceKey,
  label,
  type,
  onSelectResource,
}: {
  resourceKey: string;
  label: string;
  type: "room" | "instructor";
  onSelectResource: (v: string) => void;
}) {
  const selected = useResourceHeaderSelected(type, resourceKey);
  return (
    <th
      className={clsx(
        "group-head z-[8] cursor-pointer border-r border-b border-[#d8dfeb] bg-[#2d77cc] text-center align-top font-semibold text-white",
        GROUPS_COL_WIDTH,
        GROUPS_HEAD_PAD,
        selected && "shadow-[inset_0_-3px_0_#ffd54f]",
      )}
      onClick={() => onSelectResource(resourceKey)}
    >
      <span
        className="block w-full"
        title={scheduleAssistantDetailTooltips.resource}
      >
        {label}
      </span>
    </th>
  );
});

type CorePreparedCell = {
  key: string;
  groupId: string;
  span: number;
  mergedRows: MergedRow[];
  isProgramEmptyAtSlot: boolean;
};

type CorePreparedRow =
  | { kind: "day"; key: string; day: string; colSpan: number }
  | {
      kind: "slot";
      key: string;
      day: string;
      slotStart: string;
      slotLabel: string;
      rowHasMeetings: boolean;
      programSlotLabels: Record<string, string | null>;
      cells: CorePreparedCell[];
    };

type CorePrepared = {
  visibleColumns: Column[];
  columnsByYear: Record<string, Column[]>;
  yearLabels: string[];
  /** Extra time col when program slots are incompatible with nearest left time column. */
  showProgramTimeColumn: Record<string, boolean>;
  /** Labels for the sticky left time column (union of compatible programs). */
  stickyLeftSlots: { start: string; end: string; label: string }[];
  /** 1 sticky term time + sum((time?1:0) + n groups) per program */
  totalColSpan: number;
  rows: CorePreparedRow[];
};

function buildCorePrepared(
  grid: BuiltGrid,
  visibleColumns: Column[],
): CorePrepared {
  const columnsByYear: Record<string, Column[]> = {};
  for (const col of visibleColumns) {
    if (!columnsByYear[col.yearLabel]) columnsByYear[col.yearLabel] = [];
    columnsByYear[col.yearLabel]!.push(col);
  }
  const yearLabels = Object.keys(columnsByYear);
  const { showProgramTimeColumn, stickyLeftSlots } = resolveProgramTimeColumns(
    yearLabels,
    grid.slotsByProgramLabel,
    grid.slots,
  );
  const totalColSpan =
    1 +
    yearLabels.reduce((acc, label) => {
      const timeCols = showProgramTimeColumn[label] ? 1 : 0;
      return acc + timeCols + (columnsByYear[label]?.length || 0);
    }, 0);

  const rows: CorePreparedRow[] = [];

  for (const day of grid.allowedDays) {
    rows.push({
      kind: "day",
      key: `day-${day}`,
      day,
      colSpan: totalColSpan,
    });

    for (const slot of grid.slots) {
      const stickyLabel =
        programSlotLabelForTermRow(stickyLeftSlots, slot.start) ?? slot.label;
      const programSlotLabels: Record<string, string | null> = {};
      for (const yearLabel of yearLabels) {
        const programSlots = grid.slotsByProgramLabel[yearLabel] || [];
        if (showProgramTimeColumn[yearLabel]) {
          programSlotLabels[yearLabel] = programSlotLabelForTermRow(
            programSlots,
            slot.start,
          );
        } else {
          const match = programSlots.find((s) => s.start === slot.start);
          programSlotLabels[yearLabel] = match?.label ?? null;
        }
      }

      const cellCache = visibleColumns.map((col) => {
        const key = `${day}|${slot.start}|${col.groupId}`;
        const meetings = grid.map.get(key) || [];
        const mergedRows = mergedMeetingsForCell(meetings);
        return {
          groupId: col.groupId,
          yearLabel: col.yearLabel,
          mergedRows,
          sign: cellSignature(mergedRows),
        };
      });

      const yearHasMeetings: Record<string, boolean> = {};
      for (const yearLabel of yearLabels) {
        const yearColumns = columnsByYear[yearLabel] || [];
        yearHasMeetings[yearLabel] = yearColumns.some((col) => {
          const key = `${day}|${slot.start}|${col.groupId}`;
          return (grid.map.get(key) || []).length > 0;
        });
      }
      const rowHasMeetings = Object.values(yearHasMeetings).some(Boolean);

      const cells: CorePreparedCell[] = [];
      let i = 0;
      while (i < visibleColumns.length) {
        const current = cellCache[i]!;
        let span = 1;
        if (current.sign) {
          while (
            i + span < visibleColumns.length &&
            cellCache[i + span]!.sign === current.sign &&
            cellCache[i + span]!.yearLabel === current.yearLabel
          ) {
            span += 1;
          }
        }
        const col = visibleColumns[i]!;
        cells.push({
          key: `${day}-${slot.start}-${i}-${col.groupId}`,
          groupId: col.groupId,
          span,
          mergedRows: current.mergedRows,
          isProgramEmptyAtSlot: programSlotLabels[col.yearLabel] == null,
        });
        i += span;
      }

      rows.push({
        kind: "slot",
        key: `slot-${day}-${slot.start}`,
        day,
        slotStart: slot.start,
        slotLabel: stickyLabel,
        rowHasMeetings,
        programSlotLabels,
        cells,
      });
    }
  }

  return {
    visibleColumns,
    columnsByYear,
    yearLabels,
    showProgramTimeColumn,
    stickyLeftSlots,
    totalColSpan,
    rows,
  };
}

function CoreGroupsTable({
  grid,
  activeWeek,
  columns: baseColumns,
  allMeetings,
  config,
  activeTab,
  courseColors,
  roomCapacityById,
  groupSizeById,
  instructorLabelById,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  selectProgram,
  selectGroup,
  clearSelection,
  onEmptyCellClick,
}: {
  grid: BuiltGrid;
  activeWeek: WeekRange | null;
  columns: Column[];
  allMeetings: Meeting[];
  config: SchemaScheduleConfig;
  activeTab: InnerTab;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  instructorLabelById: Record<string, string>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectProgram: (yearLabel: string) => void;
  selectGroup: (groupId: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
}) {
  const startingDay = config.term.starting_day ?? Weekday.MONDAY;

  const visibleColumns = useMemo(
    () => columnsForTab(activeTab, baseColumns, allMeetings, config),
    [activeTab, baseColumns, allMeetings, config],
  );

  const prepared = useMemo(
    () =>
      visibleColumns.length ? buildCorePrepared(grid, visibleColumns) : null,
    [grid, visibleColumns],
  );

  if (!visibleColumns.length) {
    const lastSlotStart = grid.slots.at(-1)?.start;
    const timeOnlyRows: React.ReactNode[] = [];
    for (const day of grid.allowedDays) {
      const isTodayDay = isTodayWeekdayInDisplayedWeek(day, activeWeek);
      timeOnlyRows.push(
        <tr key={`day-${day}`} className="day-row">
          <td
            className={clsx(
              GROUPS_DAY_ROW_INNER_CLASS,
              todayGroupsDayRowClass(isTodayDay),
            )}
            style={GROUPS_DAY_ROW_STICKY_STYLE}
          >
            <span className="day-label sticky left-[9px] z-[7] inline-block bg-inherit pr-1">
              {weekdayLabelRu(day)}
            </span>
          </td>
        </tr>,
      );
      for (const slot of grid.slots) {
        const isLastSlot = slot.start === lastSlotStart;
        timeOnlyRows.push(
          <tr key={`${day}-${slot.start}`} className={GROUPS_SLOT_ROW_CLASS}>
            <td
              className={clsx(
                "slot-cell sticky left-0 z-[5] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] align-top text-[#1d3f70]",
                GROUPS_TIME_COL_WIDTH,
                GROUPS_SLOT_TIME_PAD,
                todayGroupsSlotTimeClass(isTodayDay, isLastSlot),
              )}
            >
              {slot.label}
            </td>
          </tr>,
        );
      }
    }
    return (
      <>
        <colgroup>
          <col
            style={{
              width: GROUPS_TIME_COL_PX,
              minWidth: GROUPS_TIME_COL_PX,
            }}
          />
        </colgroup>
        <thead className={GROUPS_TABLE_HEAD_CLASS}>
          <tr>
            <th
              className={clsx(
                "left-head sticky left-0 z-[25] border border-[#d8dfeb] bg-[#1f5fae] text-center align-top font-bold text-white",
                GROUPS_TIME_COL_WIDTH,
                GROUPS_HEAD_PAD,
              )}
            >
              День
            </th>
          </tr>
        </thead>
        <tbody>{timeOnlyRows}</tbody>
      </>
    );
  }

  if (!prepared) return null;

  const yearLabels = prepared.yearLabels;
  const lastSlotStart = grid.slots.at(-1)?.start;

  const rows: React.ReactNode[] = [];

  for (const preparedRow of prepared.rows) {
    if (preparedRow.kind === "day") {
      const isTodayDay = isTodayWeekdayInDisplayedWeek(
        preparedRow.day,
        activeWeek,
      );
      rows.push(
        <tr key={preparedRow.key} className="day-row">
          <td
            className={clsx(
              GROUPS_DAY_ROW_INNER_CLASS,
              todayGroupsDayRowClass(isTodayDay),
            )}
            style={GROUPS_DAY_ROW_STICKY_STYLE}
            colSpan={preparedRow.colSpan}
          >
            <span className="day-label sticky left-[9px] z-[7] inline-block bg-inherit pr-1">
              {weekdayLabelRu(preparedRow.day)}
            </span>
          </td>
        </tr>,
      );
      continue;
    }

    const isTodayDay = isTodayWeekdayInDisplayedWeek(
      preparedRow.day,
      activeWeek,
    );
    const isLastSlot = preparedRow.slotStart === lastSlotStart;

    const groupYear = new Map(
      visibleColumns.map((col) => [col.groupId, col.yearLabel] as const),
    );

    const rowCells: React.ReactNode[] = [];
    let cellIndex = 0;
    for (const [yearIndex, yearLabel] of yearLabels.entries()) {
      const programLabel = preparedRow.programSlotLabels[yearLabel];
      if (prepared.showProgramTimeColumn[yearLabel]) {
        // Sticky left:0 overlays the term time column when scrolled into view.
        rowCells.push(
          <td
            key={`${yearLabel}-time-${preparedRow.slotStart}`}
            className={clsx(
              "slot-cell sticky left-0 border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] align-top text-[#1d3f70]",
              GROUPS_TIME_COL_WIDTH,
              GROUPS_SLOT_TIME_PAD,
              (!programLabel || !preparedRow.rowHasMeetings) &&
                "bg-[#e3e8f1] text-[#5e6673]",
              todayGroupsSlotTimeClass(isTodayDay, isLastSlot),
            )}
            style={{ zIndex: 6 + yearIndex }}
          >
            {programLabel || ""}
          </td>,
        );
      }

      while (cellIndex < preparedRow.cells.length) {
        const cell = preparedRow.cells[cellIndex]!;
        if (groupYear.get(cell.groupId) !== yearLabel) break;
        const isLastInTable =
          yearIndex === yearLabels.length - 1 &&
          cellIndex === preparedRow.cells.length - 1;
        rowCells.push(
          <td
            key={cell.key}
            className={clsx(
              "link-cell relative border-r border-b border-[#d8dfeb] align-top",
              GROUPS_CELL_PAD,
              cell.span > 1 ? null : GROUPS_COL_WIDTH,
              cell.isProgramEmptyAtSlot &&
                "bg-[#eef1f6] [&_.empty]:bg-[#e9edf3]",
              todayGroupsSlotCellClass(isTodayDay, isLastInTable, isLastSlot),
            )}
            colSpan={cell.span > 1 ? cell.span : undefined}
            style={
              cell.span > 1
                ? {
                    width: cell.span * GROUPS_COL_PX,
                    maxWidth: cell.span * GROUPS_COL_PX,
                    minWidth: cell.span * GROUPS_COL_PX,
                  }
                : undefined
            }
          >
            {!cell.mergedRows.length ? (
              <div
                className={clsx(
                  "empty h-full min-h-0 min-h-[64px] rounded bg-[#fafcff]",
                  onEmptyCellClick &&
                    activeWeek &&
                    programLabel &&
                    "cursor-pointer hover:bg-[#eef4ff]",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!onEmptyCellClick || !activeWeek || !programLabel) {
                    clearSelection();
                    return;
                  }
                  onEmptyCellClick({
                    weekday: preparedRow.day as TermWeekdayKey,
                    time:
                      prepared.showProgramTimeColumn[yearLabel] && programLabel
                        ? programLabel.slice(0, 5)
                        : preparedRow.slotStart,
                    date: dateForWeekdayInWeekRange(
                      activeWeek,
                      preparedRow.day as TermWeekdayKey,
                      startingDay,
                    ),
                    groupId: cell.groupId,
                  });
                }}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-1">
                {cell.mergedRows.map((row) => (
                  <MeetingCard
                    key={row.sign}
                    span={cell.span}
                    row={row}
                    grid={grid}
                    selectMeeting={selectMeeting}
                    selectInstructorCell={selectInstructorCell}
                    selectRoomCell={selectRoomCell}
                    courseColors={courseColors}
                    roomCapacityById={roomCapacityById}
                    groupSizeById={groupSizeById}
                    instructorLabelById={instructorLabelById}
                  />
                ))}
              </div>
            )}
          </td>,
        );
        cellIndex += 1;
      }
    }

    rows.push(
      <tr key={preparedRow.key} className={GROUPS_SLOT_ROW_CLASS}>
        <td
          className={clsx(
            "slot-cell sticky left-0 z-[5] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] align-top text-[#1d3f70]",
            GROUPS_TIME_COL_WIDTH,
            GROUPS_SLOT_TIME_PAD,
            !preparedRow.rowHasMeetings && "bg-[#e3e8f1] text-[#5e6673]",
            todayGroupsSlotTimeClass(isTodayDay, isLastSlot),
          )}
        >
          {preparedRow.slotLabel}
        </td>
        {rowCells}
      </tr>,
    );
  }

  return (
    <>
      <colgroup>
        <col
          style={{
            width: GROUPS_TIME_COL_PX,
            minWidth: GROUPS_TIME_COL_PX,
          }}
        />
        {yearLabels.flatMap((yearLabel) => {
          const cols: React.ReactNode[] = [];
          if (prepared.showProgramTimeColumn[yearLabel]) {
            cols.push(
              <col
                key={`${yearLabel}-time`}
                style={{
                  width: GROUPS_TIME_COL_PX,
                  minWidth: GROUPS_TIME_COL_PX,
                }}
              />,
            );
          }
          for (const col of prepared.columnsByYear[yearLabel] || []) {
            cols.push(
              <col
                key={col.groupId}
                style={{
                  width: GROUPS_COL_PX,
                  minWidth: GROUPS_COL_PX,
                }}
              />,
            );
          }
          return cols;
        })}
      </colgroup>
      <thead className={GROUPS_TABLE_HEAD_CLASS}>
        <tr key="h1">
          <th
            className={clsx(
              "left-head sticky left-0 z-[25] border border-[#d8dfeb] bg-[#1f5fae] text-center align-top font-bold text-white",
              GROUPS_TIME_COL_WIDTH,
              GROUPS_HEAD_PAD,
            )}
            rowSpan={2}
          >
            День
          </th>
          {yearLabels.map((yearLabel) => {
            const timeCols = prepared.showProgramTimeColumn[yearLabel] ? 1 : 0;
            return (
              <CoreYearHeadCell
                key={yearLabel}
                yearLabel={yearLabel}
                colSpan={
                  timeCols + (prepared.columnsByYear[yearLabel]?.length || 0)
                }
                onSelectProgram={selectProgram}
              />
            );
          })}
        </tr>
        <tr key="h2">
          {yearLabels.flatMap((yearLabel, yearIndex) => {
            const cols = prepared.columnsByYear[yearLabel] || [];
            const cells: React.ReactNode[] = [];
            if (prepared.showProgramTimeColumn[yearLabel]) {
              cells.push(
                <th
                  key={`${yearLabel}-time`}
                  className={clsx(
                    "sticky left-0 border border-[#d8dfeb] bg-[#1f5fae] text-center text-xs font-semibold text-white",
                    GROUPS_TIME_COL_WIDTH,
                    GROUPS_HEAD_PAD,
                  )}
                  style={{ zIndex: 26 + yearIndex }}
                >
                  Время
                </th>,
              );
            }
            for (const col of cols) {
              cells.push(
                <CoreGroupHeadCell
                  key={col.groupId}
                  groupId={col.groupId}
                  groupLabel={col.groupLabel}
                  yearLabel={yearLabel}
                  onSelectGroup={selectGroup}
                />,
              );
            }
            return cells;
          })}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </>
  );
}

const MeetingCard = memo(function MeetingCard({
  row,
  grid: _grid,
  span = 1,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  courseColors,
  roomCapacityById,
  groupSizeById,
  instructorLabelById,
}: MeetingCardProps) {
  const m = row.sample;
  const count = row.count;
  const courseTitle = String(m.course || "").trim() || "—";
  const colors = colorBySubject(m.course || courseTitle, courseColors);
  const roomLoadLabel = meetingRoomLoadLabel(
    m,
    roomCapacityById,
    groupSizeById,
  );
  const overCap = meetingRoomLoadOverCapacity(
    m,
    roomCapacityById,
    groupSizeById,
  );
  const roomIdTrim = (m.room || "").trim();
  const bits = useMeetingHighlightBits(m);
  const isSelected = (bits & 1) !== 0;
  const isRelated = (bits & 2) !== 0;

  const roomClickableClass = clsx(
    "clickable cursor-pointer font-semibold underline decoration-dotted decoration-2 underline-offset-2",
    overCap
      ? "!text-[#b42318] decoration-[#b42318] hover:!text-[#7f1d1d] hover:decoration-[#7f1d1d]"
      : "text-[#4f5c6d] hover:text-[#303a47] hover:decoration-solid",
  );

  const isWideCell = span > 1;
  const instructorNames =
    typeof m.instructors === "string"
      ? m.instructors
        ? [m.instructors]
        : []
      : (m.instructors ?? []);
  const instructorLabels = instructorNames.map((id) =>
    resolveInstructorLabel(id, instructorLabelById),
  );

  const meetingHighlightClass = clsx(
    isSelected &&
      isRelated &&
      "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2),0_2px_10px_rgba(0,0,0,0.12)] ring-2 ring-inset ring-[#1d3f70]",
    isSelected &&
      !isRelated &&
      "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2)] ring-2 ring-inset ring-[#1d3f70]",
    !isSelected &&
      isRelated &&
      "shadow-[inset_0_0_0_1px_rgba(29,63,112,0.14)] ring-1 ring-inset ring-dashed ring-[rgba(29,63,112,0.55)]",
  );

  const body = (
    <div
      className={clsx(
        GROUPS_MEETING_BODY_CLASS,
        isWideCell && "w-max max-w-full",
      )}
    >
      <div
        className={clsx(
          "subject flex min-h-0 min-w-0 gap-1 overflow-hidden",
          isWideCell && "w-max max-w-full",
        )}
      >
        <div
          className={clsx(
            "min-h-0 min-w-0 overflow-hidden",
            isWideCell ? "w-max max-w-full" : "flex-1",
          )}
        >
          <div
            className={GROUPS_MEETING_TITLE_CLASS}
            title={`${courseTitle} (${m.tag})${count > 1 ? ` x${count}` : ""}`}
          >
            {courseTitle} ({m.tag}){count > 1 ? ` x${count}` : ""}
          </div>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <MeetingOverrideFieldBadge
            field="weekday"
            fields={m.override_fields}
          />
          <MeetingOverrideFieldBadge field="time" fields={m.override_fields} />
        </span>
      </div>
      {m.off_grid ? (
        <div className="text-[11px] leading-tight font-semibold text-[#8a6d3b]">
          {m.start}
          {m.end ? `–${m.end}` : ""}
        </div>
      ) : null}
      <div className={GROUPS_MEETING_FOOTER_CLASS}>
        <div
          className={clsx(
            GROUPS_MEETING_LINE_CLASS,
            isWideCell
              ? "w-max max-w-full overflow-hidden whitespace-normal"
              : "overflow-hidden text-ellipsis whitespace-nowrap",
          )}
          title={instructorLabels.join(" / ")}
        >
          <span className="inline-flex max-w-full flex-wrap items-center gap-1">
            <span className={clsx("min-w-0", !isWideCell && "truncate")}>
              {instructorNames.length
                ? instructorNames.map((name, idx) => {
                    const label = instructorLabels[idx]!;
                    return (
                      <span key={name}>
                        <span
                          className="clickable inline cursor-pointer font-semibold text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid"
                          title={instructorDetailTooltip(label)}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            selectInstructorCell(name);
                          }}
                        >
                          {label}
                        </span>
                        {idx < instructorNames.length - 1 ? " / " : null}
                      </span>
                    );
                  })
                : "-"}
            </span>
            <MeetingOverrideFieldBadge
              field="instructor"
              fields={m.override_fields}
            />
          </span>
        </div>
        <div
          className={clsx(
            GROUPS_MEETING_LINE_CLASS,
            "overflow-hidden text-ellipsis whitespace-nowrap",
            isWideCell && "w-max max-w-full",
            overCap ? "font-bold text-[#b42318]" : null,
          )}
          title={roomLoadLabel}
        >
          <span className="inline-flex max-w-full items-center gap-1">
            {roomIdTrim ? (
              <span
                className={clsx(roomClickableClass, "inline min-w-0 truncate")}
                title={scheduleAssistantDetailTooltips.room}
                onClick={(ev) => {
                  ev.stopPropagation();
                  selectRoomCell(m.room);
                }}
              >
                {roomLoadLabel}
              </span>
            ) : (
              <span className="min-w-0 truncate">{roomLoadLabel}</span>
            )}
            <MeetingOverrideFieldBadge
              field="room"
              fields={m.override_fields}
            />
          </span>
        </div>
      </div>
    </div>
  );

  const offsetMinutes = m.off_grid ? (m.off_grid_offset_minutes ?? 0) : 0;
  const offsetPx = Math.max(
    -12,
    Math.min(48, Math.round(offsetMinutes * 0.55)),
  );

  return (
    <div
      data-meeting-id={m.instance_id}
      className={clsx(
        "meeting relative z-[2] rounded-lg",
        GROUPS_MEETING_CLASS,
        isWideCell ? "overflow-visible" : "overflow-hidden",
        meetingHighlightClass,
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        marginTop: offsetPx !== 0 ? `${offsetPx}px` : undefined,
      }}
      onClick={() => {
        selectMeeting(meetingSelectionKey(m), m.course || courseTitle);
      }}
    >
      {isWideCell ? (
        <div
          className="sticky z-[1] inline-flex h-full max-h-full w-max max-w-full flex-col gap-0.5 self-start overflow-hidden"
          style={{
            left: "calc(var(--sa-time-col-width, 130px) + 8px)",
            backgroundColor: colors.bg,
          }}
        >
          {body}
        </div>
      ) : (
        body
      )}
    </div>
  );
}, meetingCardPropsEqual);

function renderUtilizationRows(args: {
  mode: "instructor" | "room";
  grid: BuiltGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  instructorLabelById: Record<string, string>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectInstructorHeader: (name: string) => void;
  selectRoomHeader: (room: string) => void;
}) {
  const {
    mode,
    grid,
    courseColors,
    roomCapacityById,
    groupSizeById,
    instructorLabelById,
    selectMeeting,
    selectInstructorCell,
    selectRoomCell,
    selectInstructorHeader,
    selectRoomHeader,
  } = args;

  const weekMeetings = grid.weekMeetings || [];
  let resourceCols: string[] = [];
  let headerTitle = "";
  if (mode === "instructor") {
    resourceCols = Array.from(
      new Set(
        weekMeetings.flatMap((m) =>
          typeof m.instructors === "string" ? [m.instructors] : m.instructors,
        ),
      ),
    ).sort((a, b) =>
      resolveInstructorLabel(a, instructorLabelById).localeCompare(
        resolveInstructorLabel(b, instructorLabelById),
        "en",
        { sensitivity: "base" },
      ),
    );
    headerTitle = "Преподаватели";
  } else {
    resourceCols = Array.from(
      new Set(weekMeetings.map((m) => m.room).filter(Boolean)),
    ).sort();
    headerTitle = "Аудитории";
  }

  const rows: React.ReactNode[] = [];
  const thead = (
    <thead className={GROUPS_TABLE_HEAD_CLASS}>
      <tr key="uh1">
        <th
          className={clsx(
            "left-head sticky left-0 z-[25] border border-[#d8dfeb] bg-[#1f5fae] text-center align-top font-bold text-white",
            GROUPS_TIME_COL_WIDTH,
            GROUPS_HEAD_PAD,
          )}
          rowSpan={2}
        >
          День / время
        </th>
        <th
          className={clsx(
            "year-head z-[8] border-t border-r border-b border-[#d8dfeb] bg-[#1f5fae] text-center align-top font-bold text-white",
            GROUPS_HEAD_PAD,
          )}
          colSpan={Math.max(1, resourceCols.length)}
        >
          {headerTitle}
        </th>
      </tr>
      <tr key="uh2">
        {resourceCols.map((col) => {
          const cap = roomCapacityById?.[col];
          const onSelectResource =
            mode === "instructor" ? selectInstructorHeader : selectRoomHeader;
          const label =
            mode === "room"
              ? `${col} (вм. ${cap ?? "-"})`
              : resolveInstructorLabel(col, instructorLabelById);
          return (
            <UtilResourceHeadCell
              key={col}
              resourceKey={col}
              label={label}
              type={mode === "room" ? "room" : "instructor"}
              onSelectResource={onSelectResource}
            />
          );
        })}
      </tr>
    </thead>
  );

  for (const day of grid.allowedDays) {
    rows.push(
      <tr key={`ud-${day}`} className="day-row">
        <td
          className={GROUPS_DAY_ROW_INNER_CLASS}
          style={GROUPS_DAY_ROW_STICKY_STYLE}
          colSpan={resourceCols.length + 1}
        >
          <span className="day-label sticky left-[9px] z-[7] inline-block bg-inherit pr-1">
            {weekdayLabelRu(day)}
          </span>
        </td>
      </tr>,
    );

    for (const slot of grid.slots) {
      const cells = resourceCols.map((resource) => {
        const matches = weekMeetings.filter((m) => {
          if (dayKeyFromModel(m.date) !== day) return false;
          if (String(m.start).slice(0, 5) !== slot.start) return false;
          if (mode === "instructor")
            return (
              typeof m.instructors === "string"
                ? [m.instructors]
                : m.instructors
            ).includes(resource);
          return (m.room || "") === resource;
        });

        if (!matches.length) {
          return (
            <td
              key={resource}
              className={clsx(
                "link-cell relative border-r border-b border-[#d8dfeb] align-top",
                GROUPS_COL_WIDTH,
                GROUPS_CELL_PAD,
              )}
            >
              <div className="empty h-full min-h-0 min-h-[64px] rounded bg-[#fafcff]" />
            </td>
          );
        }

        const merged = mergedMeetingsForCell(matches);

        return (
          <td
            key={resource}
            className={clsx(
              "link-cell relative border-r border-b border-[#d8dfeb] align-top",
              GROUPS_COL_WIDTH,
              GROUPS_CELL_PAD,
            )}
          >
            <div className="flex h-full min-h-0 flex-col gap-1">
              {merged.map((row) => {
                return (
                  <UtilizationMeetingCard
                    key={row.sign}
                    row={row}
                    mode={mode}
                    grid={grid}
                    selectMeeting={selectMeeting}
                    selectInstructorCell={selectInstructorCell}
                    selectRoomCell={selectRoomCell}
                    courseColors={courseColors}
                    roomCapacityById={roomCapacityById}
                    groupSizeById={groupSizeById}
                    instructorLabelById={instructorLabelById}
                  />
                );
              })}
            </div>
          </td>
        );
      });

      rows.push(
        <tr key={`us-${day}-${slot.start}`} className={GROUPS_SLOT_ROW_CLASS}>
          <td
            className={clsx(
              "slot-cell sticky left-0 z-[4] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] align-top text-[#1d3f70]",
              GROUPS_TIME_COL_WIDTH,
              GROUPS_SLOT_TIME_PAD,
            )}
          >
            {slot.label}
          </td>
          {cells}
        </tr>,
      );
    }
  }

  return (
    <>
      {thead}
      <tbody>{rows}</tbody>
    </>
  );
}

const UtilizationMeetingCard = memo(function UtilizationMeetingCard({
  row,
  mode,
  grid: _grid,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  courseColors,
  roomCapacityById,
  groupSizeById,
  instructorLabelById,
}: UtilizationMeetingCardProps) {
  const m = row.sample;
  const courseTitle = String(m.course || "").trim() || "—";
  const colors = colorBySubject(m.course || courseTitle, courseColors);
  const roomLoad = meetingRoomLoadLabel(m, roomCapacityById, groupSizeById);
  const overCap = meetingRoomLoadOverCapacity(
    m,
    roomCapacityById,
    groupSizeById,
  );
  const roomIdTrim = (m.room || "").trim();
  const bits = useMeetingHighlightBits(m);
  const isSelected = (bits & 1) !== 0;
  const isRelated = (bits & 2) !== 0;
  const roomClickableClass = clsx(
    "clickable cursor-pointer font-semibold underline decoration-dotted decoration-2 underline-offset-2",
    overCap
      ? "!text-[#b42318] decoration-[#b42318] hover:!text-[#7f1d1d] hover:decoration-[#7f1d1d]"
      : "text-[#4f5c6d] hover:text-[#303a47] hover:decoration-solid",
  );
  const instructorIds =
    typeof m.instructors === "string"
      ? m.instructors
        ? [m.instructors]
        : []
      : (m.instructors ?? []);
  const instructorLabels = instructorIds.map((id) =>
    resolveInstructorLabel(id, instructorLabelById),
  );

  return (
    <div
      data-meeting-id={m.instance_id}
      className={clsx(
        "meeting relative z-[2] overflow-hidden rounded-lg",
        GROUPS_MEETING_CLASS,
        isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2),0_2px_10px_rgba(0,0,0,0.12)] ring-2 ring-[#1d3f70] ring-inset",
        isSelected &&
          !isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2)] ring-2 ring-[#1d3f70] ring-inset",
        !isSelected &&
          isRelated &&
          "ring-dashed shadow-[inset_0_0_0_1px_rgba(29,63,112,0.14)] ring-1 ring-[rgba(29,63,112,0.55)] ring-inset",
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      onClick={() => {
        selectMeeting(meetingSelectionKey(m), m.course || courseTitle);
      }}
    >
      <div className={GROUPS_MEETING_BODY_CLASS}>
        <div className="flex min-h-0 min-w-0 overflow-hidden">
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className={GROUPS_MEETING_TITLE_CLASS}
              title={`${courseTitle} (${m.tag})${row.count > 1 ? ` x${row.count}` : ""}`}
            >
              {courseTitle} ({m.tag}){row.count > 1 ? ` x${row.count}` : ""}
            </div>
          </div>
        </div>
        <div className={GROUPS_MEETING_FOOTER_CLASS}>
          <div
            className={clsx(
              GROUPS_MEETING_LINE_CLASS,
              "overflow-hidden text-ellipsis whitespace-nowrap",
              overCap
                ? "!font-bold !text-[#b42318] [&_.clickable]:!text-[#b42318] [&_.clickable]:decoration-[#b42318]"
                : null,
            )}
            title={
              mode === "instructor"
                ? `${m.groups.join(", ")} | ${roomLoad}`
                : `${m.groups.join(", ")} | ${roomLoad} | заполн. ${roomFillPercent(m, roomCapacityById, groupSizeById)} | ${instructorLabels.join(" / ")}`
            }
          >
            {mode === "instructor" ? (
              <>
                {m.groups.join(", ")} |{" "}
                {roomIdTrim ? (
                  <span
                    className={clsx(roomClickableClass, "inline")}
                    title={scheduleAssistantDetailTooltips.room}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      selectRoomCell(m.room);
                    }}
                  >
                    {roomLoad}
                  </span>
                ) : (
                  roomLoad
                )}
              </>
            ) : (
              <>
                {m.groups.join(", ")} |{" "}
                {roomIdTrim ? (
                  <span
                    className={clsx(roomClickableClass, "inline")}
                    title={scheduleAssistantDetailTooltips.room}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      selectRoomCell(m.room);
                    }}
                  >
                    {roomLoad}
                  </span>
                ) : (
                  roomLoad
                )}{" "}
                | заполн. {roomFillPercent(m, roomCapacityById, groupSizeById)}{" "}
                |{" "}
                {instructorIds.length
                  ? instructorIds.map((name, idx) => {
                      const label = instructorLabels[idx]!;
                      return (
                        <span key={name}>
                          {idx > 0 ? " / " : null}
                          <span
                            className="clickable inline cursor-pointer font-semibold text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid"
                            title={instructorDetailTooltip(label)}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              selectInstructorCell(name);
                            }}
                          >
                            {label}
                          </span>
                        </span>
                      );
                    })
                  : "-"}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, utilizationMeetingCardPropsEqual);
