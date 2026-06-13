import { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import clsx from "clsx";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  getScheduleSections,
  useConfig,
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { useToast } from "@/components/toast";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { EditClassModal } from "./EditClassModal.tsx";
import { MeetingOverrideFieldBadge } from "./meetingOverrideIndicator.tsx";
import {
  canRestoreMeeting,
  parseMeetingInstanceId,
  restoreMeetingInCourse,
} from "./meetingEditUtils.ts";
import { computeDetailPanel } from "./scheduleAssistantDetailPanel.tsx";
import {
  type BuiltGrid,
  type Column,
  type Meeting,
  type MergedRow,
  type Selection,
  type WeekRange,
  buildColumns,
  buildCourseColors,
  buildGrid,
  buildGroupSizeMap,
  buildMeetings,
  buildRoomCapacityMap,
  buildWeeks,
  cellSignature,
  colorBySubject,
  columnsForTab,
  dayKey as dayKeyFromModel,
  meetingRoomLoadLabel,
  meetingRoomLoadOverCapacity,
  meetingSelectionKey,
  mergedMeetingsForCell,
  roomFillPercent,
  scheduleAssistantDetailTooltips,
  buildCoursesToSections,
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
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
};

function meetingCardPropsEqual(
  prev: MeetingCardProps,
  next: MeetingCardProps,
): boolean {
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

function TimetableWorkspaceInner() {
  const { config } = useConfig();
  const [msg, setMsg] = useState("");
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [columns, setColumns] = useState<Column[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [courseColors, setCourseColors] = useState<
    Record<string, { bg: string; border: string }>
  >({});
  const [activeTab, setActiveTab] = useState<InnerTab>("core");
  const [roomCapacityById, setRoomCapacityById] = useState<
    Record<string, number>
  >({});
  const [groupSizeById, setGroupSizeById] = useState<
    Record<string, number | null | undefined>
  >({});
  const [isMiddleDragScrolling, setIsMiddleDragScrolling] = useState(false);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const dragScrollStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);

  const selectionStore = useMemo(() => createSelectionStore(), []);

  const coursesToSections = useMemo(
    () => config && buildCoursesToSections(config),
    [config],
  );

  useEffect(() => {
    if (!config) return;
    const sectionCodes = getScheduleSections(config).map(
      (section) => section.code,
    );
    if (!sectionCodes.length) return;
    const validTabs = new Set<InnerTab>([
      ...sectionCodes,
      "instructor",
      "room",
    ]);
    setActiveTab((current) =>
      validTabs.has(current) ? current : (sectionCodes[0] as InnerTab),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.term?.sections]);

  useEffect(() => {
    if (!config || !coursesToSections) {
      setAllMeetings([]);
      setColumns([]);
      setWeeks([]);
      setWeekIndex(0);
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
      setWeeks(buildWeeks(meetings));
      setWeekIndex(0);
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

    function handleWrapMouseDown(event: MouseEvent) {
      if (event.button !== 1) return;
      event.preventDefault();
      dragScrollStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: targetWrap.scrollLeft,
        startScrollTop: targetWrap.scrollTop,
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
      wrap.scrollLeft = dragState.startScrollLeft - dx;
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
    if (!config || !allMeetings.length || !weeks.length) return null;
    const wk = weeks[weekIndex];
    if (!wk) return null;
    return buildGrid(config, allMeetings, wk.start, activeTab);
  }, [config, allMeetings, weeks, weekIndex, activeTab]);

  const applyTabChange = useCallback(
    (nextTab: InnerTab) => {
      setActiveTab(nextTab);
      selectionStore.setSelection(null);
    },
    [selectionStore],
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
    : `Нед. ${weekIndex + 1}/${weeks.length}: ${weeks[weekIndex]!.start} — ${weeks[weekIndex]!.end}`;

  return (
    <SelectionStoreContext.Provider value={selectionStore}>
      <div className="font-rubik text-base-content flex h-full min-h-0 flex-1 flex-col leading-[1.45] antialiased">
        <div className="mx-auto mt-0 flex h-full min-h-0 w-full max-w-none flex-1 flex-row items-stretch gap-0 p-0 max-[1200px]:flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {msg ? (
              <div className="alert alert-error alert-soft mx-2 mt-2 shrink-0 py-2 text-sm">
                {msg}
              </div>
            ) : null}

            <div className="schedule-assistant-toolbar flex shrink-0 flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
              <div className="join shrink-0">
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
                  className="join-item btn btn-xs btn-ghost no-animation text-base-content flex min-h-8 max-w-[min(100vw-8rem,20rem)] min-w-[10.5rem] cursor-default items-center justify-center px-2 text-center text-sm font-normal normal-case"
                  role="status"
                  aria-live="polite"
                >
                  {weekLabel}
                </span>
                <button
                  type="button"
                  className="btn btn-xs join-item min-h-8 min-w-8 px-0"
                  title="Следующая неделя"
                  disabled={weekIndex >= weeks.length - 1 || !weeks.length}
                  onClick={() => {
                    if (weekIndex < weeks.length - 1)
                      setWeekIndex((i) => i + 1);
                  }}
                >
                  ›
                </button>
              </div>
              <TimetableTabSelector
                config={config}
                activeTab={activeTab}
                onTabChange={applyTabChange}
              />
            </div>

            <div
              id="tableStage"
              className="relative flex min-h-0 min-h-[280px] flex-1 flex-col"
            >
              <div
                id="gridWrap"
                ref={gridWrapRef}
                className={clsx(
                  "rounded-tr-box min-h-80 flex-1 overflow-auto overscroll-x-contain border border-t-0 border-[#d8dfeb] bg-white [overflow-anchor:none]",
                  isMiddleDragScrolling ? "cursor-grabbing" : "cursor-auto",
                )}
              >
                {grid && columns.length ? (
                  <TimetableTable
                    key={activeTab}
                    tabMode={activeTab}
                    grid={grid}
                    columns={columns}
                    allMeetings={allMeetings}
                    config={config}
                    courseColors={courseColors}
                    roomCapacityById={roomCapacityById}
                    groupSizeById={groupSizeById}
                    selectMeeting={selectMeeting}
                    selectInstructorCell={selectInstructorCell}
                    selectRoomCell={selectRoomCell}
                    selectInstructorHeader={selectInstructorHeader}
                    selectRoomHeader={selectRoomHeader}
                    selectProgram={selectProgram}
                    selectGroup={selectGroup}
                    clearSelection={clearSelection}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <aside
            className="detail border-base-300 bg-base-100 rounded-box mt-4 mr-4 mb-4 ml-3 flex min-h-0 w-[360px] shrink-0 flex-col self-stretch overflow-y-auto border p-3 max-[1200px]:m-0 max-[1200px]:mt-2 max-[1200px]:min-h-0 max-[1200px]:w-full max-[1200px]:flex-1"
            id="detail"
          >
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
          </aside>
        </div>
      </div>
    </SelectionStoreContext.Provider>
  );
}

export function TimetableWorkspace() {
  return <TimetableWorkspaceInner />;
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
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const sections = getScheduleSections(config);
  const options: { value: InnerTab; label: string }[] = [
    ...sections.map((section) => ({
      value: section.code,
      label: section.name,
    })),
    { value: "instructor", label: "По преподавателям" },
    { value: "room", label: "По аудиториям" },
  ];
  const currentLabel =
    options.find((option) => option.value === activeTab)?.label ??
    options[0]?.label ??
    "Режим таблицы";

  function handleOptionClick(nextTab: InnerTab) {
    onTabChange(nextTab);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details
      ref={detailsRef}
      className="dropdown dropdown-end shrink-0 sm:ml-auto"
    >
      <summary className="select select-bordered select-xs flex h-8 min-h-8 w-[10.5rem] cursor-pointer list-none items-center justify-between px-3 text-sm font-normal [&::-webkit-details-marker]:hidden">
        <span className="truncate">{currentLabel}</span>
        <span className="icon-[material-symbols--expand-more] shrink-0 text-base" />
      </summary>
      <ul className="dropdown-content border-base-300 bg-base-100 rounded-box mt-1 w-[12rem] border p-1 shadow-sm">
        {options.map((option, i) => (
          <li key={i}>
            <button
              type="button"
              className={clsx(
                "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                activeTab === option.value && "bg-base-200 font-semibold",
              )}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

type TimetableTableProps = {
  tabMode: InnerTab;
  grid: BuiltGrid;
  columns: Column[];
  allMeetings: Meeting[];
  config: SchemaScheduleConfig;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectInstructorHeader: (name: string) => void;
  selectRoomHeader: (room: string) => void;
  selectProgram: (yearLabel: string) => void;
  selectGroup: (groupId: string) => void;
  clearSelection: () => void;
};

function TimetableTable({
  tabMode,
  grid,
  columns,
  allMeetings,
  config,
  courseColors,
  roomCapacityById,
  groupSizeById,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  selectInstructorHeader,
  selectRoomHeader,
  selectProgram,
  selectGroup,
  clearSelection,
}: TimetableTableProps) {
  return (
    <table
      id="table"
      className="isolate w-max min-w-[980px] table-fixed border-separate border-spacing-0"
    >
      {tabMode === "instructor" || tabMode === "room"
        ? renderUtilizationRows({
            mode: tabMode === "instructor" ? "instructor" : "room",
            grid,
            courseColors,
            roomCapacityById,
            groupSizeById,
            selectMeeting,
            selectInstructorCell,
            selectRoomCell,
            selectInstructorHeader,
            selectRoomHeader,
          })
        : renderCoreRows({
            grid,
            columns,
            allMeetings,
            config,
            activeTab: tabMode,
            courseColors,
            roomCapacityById,
            groupSizeById,
            selectMeeting,
            selectInstructorCell,
            selectRoomCell,
            selectProgram,
            selectGroup,
            clearSelection,
          })}
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
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          className="detail-title min-w-0 flex-1 pr-1 text-base leading-snug font-semibold [overflow-wrap:anywhere] text-[#243957]"
          id="detailTitle"
        >
          {detail.detailTitle}
        </div>
        {!editModalOpen ? (
          <div className="flex shrink-0 items-center gap-1">
            {canEditSelectedMeeting ? (
              <button
                className="btn btn-primary btn-xs"
                type="button"
                onClick={() => setEditModalOpen(true)}
              >
                Редактировать
              </button>
            ) : null}
            <button
              className="btn btn-outline btn-xs shrink-0"
              id="clearSelectionBtn"
              type="button"
              onClick={clearSelection}
            >
              Сбросить
            </button>
          </div>
        ) : null}
      </div>
      <div
        className="detail-summary mb-2 min-h-4 text-[0.8125rem] text-[#4f5c6d]"
        id="detailSummary"
      >
        {detail.detailSummary}
      </div>
      {!detail.histogramHidden ? (
        <div
          id="detailHistogram"
          className="my-2 flex shrink-0 flex-col gap-2.5"
          dangerouslySetInnerHTML={{ __html: detail.histogramHtml }}
        />
      ) : (
        <div
          id="detailHistogram"
          className="my-2 flex shrink-0 flex-col gap-2.5"
          hidden
        />
      )}
      <div
        className="grid gap-0.5 text-xs"
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
        "year-head z-[8] cursor-pointer border-t border-r border-b border-[#d8dfeb] bg-[#1f5fae] p-2 text-center [vertical-align:top] text-[0.875rem] font-bold text-white",
        programSelected && "shadow-[inset_0_-3px_0_#ffd54f]",
      )}
      colSpan={colSpan}
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
        "group-head z-[8] w-[170px] max-w-[170px] min-w-[170px] cursor-pointer border-r border-b border-[#d8dfeb] bg-[#2d77cc] p-2 text-center [vertical-align:top] text-[0.75rem] font-semibold text-white",
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
        "group-head z-[8] w-[170px] max-w-[170px] min-w-[170px] cursor-pointer border-r border-b border-[#d8dfeb] bg-[#2d77cc] p-2 text-center [vertical-align:top] text-[0.75rem] font-semibold text-white",
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
      slotLabel: string;
      rowHasMeetings: boolean;
      cells: CorePreparedCell[];
    };

type CorePrepared = {
  visibleColumns: Column[];
  columnsByYear: Record<string, Column[]>;
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

  const rows: CorePreparedRow[] = [];

  for (const day of grid.allowedDays) {
    rows.push({
      kind: "day",
      key: `day-${day}`,
      day,
      colSpan: visibleColumns.length + 1,
    });

    for (const slot of grid.slots) {
      const cellCache = visibleColumns.map((col) => {
        const key = `${day}|${slot.start}|${col.groupId}`;
        const meetings = grid.map.get(key) || [];
        const mergedRows = mergedMeetingsForCell(meetings);
        return {
          groupId: col.groupId,
          mergedRows,
          sign: cellSignature(mergedRows),
        };
      });

      const yearHasMeetings: Record<string, boolean> = {};
      for (const yearLabel of Object.keys(columnsByYear)) {
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
            cellCache[i + span]!.sign === current.sign
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
          isProgramEmptyAtSlot: !yearHasMeetings[col.yearLabel],
        });
        i += span;
      }

      rows.push({
        kind: "slot",
        key: `slot-${day}-${slot.start}`,
        slotLabel: slot.label,
        rowHasMeetings,
        cells,
      });
    }
  }

  return { visibleColumns, columnsByYear, rows };
}

function renderCoreRows(args: {
  grid: BuiltGrid;
  columns: Column[];
  allMeetings: Meeting[];
  config: SchemaScheduleConfig;
  activeTab: InnerTab;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  selectMeeting: (valueKey: string, course: string) => void;
  selectInstructorCell: (name: string) => void;
  selectRoomCell: (room: string) => void;
  selectProgram: (yearLabel: string) => void;
  selectGroup: (groupId: string) => void;
  clearSelection: () => void;
}) {
  const {
    grid,
    columns: baseColumns,
    allMeetings,
    config,
    activeTab,
    courseColors,
    roomCapacityById,
    groupSizeById,
    selectMeeting,
    selectInstructorCell,
    selectRoomCell,
    selectProgram,
    selectGroup,
    clearSelection,
  } = args;

  const visibleColumns = columnsForTab(
    activeTab,
    baseColumns,
    allMeetings,
    config,
  );
  if (!visibleColumns.length) return null;

  const prepared = buildCorePrepared(grid, visibleColumns);

  const thead = (
    <thead className="sticky top-0 z-[20]">
      <tr key="h1">
        <th
          className="left-head sticky left-0 z-[25] w-[130px] min-w-[130px] border border-[#d8dfeb] bg-[#1f5fae] p-2 text-center [vertical-align:top] text-[0.8125rem] font-bold text-white"
          rowSpan={2}
        >
          День / время
        </th>
        {Object.keys(prepared.columnsByYear).map((yearLabel) => (
          <CoreYearHeadCell
            key={yearLabel}
            yearLabel={yearLabel}
            colSpan={prepared.columnsByYear[yearLabel]!.length}
            onSelectProgram={selectProgram}
          />
        ))}
      </tr>
      <tr key="h2">
        {Object.keys(prepared.columnsByYear).flatMap((yearLabel) =>
          prepared.columnsByYear[yearLabel]!.map((col) => (
            <CoreGroupHeadCell
              key={col.groupId}
              groupId={col.groupId}
              groupLabel={col.groupLabel}
              yearLabel={yearLabel}
              onSelectGroup={selectGroup}
            />
          )),
        )}
      </tr>
    </thead>
  );

  const rows: React.ReactNode[] = [];

  for (const preparedRow of prepared.rows) {
    if (preparedRow.kind === "day") {
      rows.push(
        <tr key={preparedRow.key} className="day-row">
          <td
            className="sticky top-[66px] z-[6] border-r border-b border-l border-[#d8dfeb] bg-[#edf4ff] p-2 [vertical-align:top] text-[0.875rem] font-bold tracking-[0.4px] text-[#1d3f70] uppercase"
            colSpan={preparedRow.colSpan}
          >
            <span className="day-label sticky left-[9px] z-[7] inline-block bg-[#edf4ff] pr-1">
              {preparedRow.day}
            </span>
          </td>
        </tr>,
      );
      continue;
    }

    const cells = preparedRow.cells.map((cell) => (
      <td
        key={cell.key}
        className={clsx(
          "link-cell relative w-[170px] max-w-[170px] min-w-[170px] border-r border-b border-[#d8dfeb] p-2 [vertical-align:top] align-top text-[0.75rem]",
          cell.isProgramEmptyAtSlot && "bg-[#eef1f6] [&_.empty]:bg-[#e9edf3]",
        )}
        colSpan={cell.span > 1 ? cell.span : undefined}
      >
        {!cell.mergedRows.length ? (
          <div
            className="empty h-full min-h-0 min-h-[78px] rounded-lg bg-[#fafcff]"
            onClick={clearSelection}
          />
        ) : (
          <>
            {renderConnectors(cell.mergedRows, cell.span, grid, courseColors)}
            <div className="flex h-full min-h-0 flex-col gap-1.5">
              {cell.mergedRows.map((row) => {
                return (
                  <MeetingCard
                    key={row.sign}
                    row={row}
                    grid={grid}
                    selectMeeting={selectMeeting}
                    selectInstructorCell={selectInstructorCell}
                    selectRoomCell={selectRoomCell}
                    courseColors={courseColors}
                    roomCapacityById={roomCapacityById}
                    groupSizeById={groupSizeById}
                  />
                );
              })}
            </div>
          </>
        )}
      </td>
    ));

    rows.push(
      <tr
        key={preparedRow.key}
        className="slot-row [&_.empty]:h-full [&_.empty]:min-h-[78px] [&_.meeting]:h-full [&_.meeting]:min-h-[86px] [&_td]:h-[116px]"
      >
        <td
          className={clsx(
            "slot-cell sticky left-0 z-[4] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] p-2 text-center [vertical-align:top] text-[0.75rem] font-bold",
            !preparedRow.rowHasMeetings && "bg-[#e3e8f1] text-[#5e6673]",
          )}
        >
          {preparedRow.slotLabel}
        </td>
        {cells}
      </tr>,
    );
  }

  rows.push(
    <tr
      key="scroll-pad-core"
      className="slot-row [&_.empty]:h-full [&_.empty]:min-h-[78px] [&_.meeting]:h-full [&_.meeting]:min-h-[86px] [&_td]:h-[116px]"
      aria-hidden
    >
      <td className="slot-cell sticky left-0 z-[4] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] p-2 text-center [vertical-align:top] text-[0.75rem] font-bold" />
      {prepared.visibleColumns.map((col) => (
        <td
          key={`scroll-pad-core-${col.groupId}`}
          className="link-cell relative w-[170px] max-w-[170px] min-w-[170px] border-r border-b border-[#d8dfeb] bg-[#eef1f6] p-2 [vertical-align:top] align-top text-[0.75rem] [&_.empty]:bg-[#e9edf3]"
        >
          <div
            className="empty h-full min-h-0 min-h-[78px] rounded-lg bg-[#fafcff]"
            onClick={clearSelection}
          />
        </td>
      ))}
    </tr>,
  );

  return (
    <>
      {thead}
      <tbody>{rows}</tbody>
    </>
  );
}

function renderConnectors(
  mergedRows: MergedRow[],
  span: number,
  grid: BuiltGrid,
  courseColors: Record<string, { bg: string; border: string }>,
) {
  const hasSource = mergedRows.some((r) =>
    grid.backToBackSources?.has(r.sample.instance_id),
  );
  const hasTarget = mergedRows.some((r) =>
    grid.backToBackTargets?.has(r.sample.instance_id),
  );
  if (!hasSource && !hasTarget) return null;
  const direction = hasSource && hasTarget ? "both" : hasSource ? "down" : "up";
  const markers = Math.max(1, span);
  const sampleColor = colorBySubject(
    mergedRows[0]?.sample?.course || "",
    courseColors,
  ).border;
  const els: React.ReactNode[] = [];
  for (let mk = 0; mk < markers; mk++) {
    const leftPct = `${((mk + 0.5) / markers) * 100}%`;
    els.push(
      <div
        key={mk}
        className={clsx(
          "cell-connector pointer-events-none absolute z-[1] w-0.5 rounded-full shadow-[0_0_0_1px_rgba(80,92,110,0.15)]",
          direction === "down" && "bottom-[-7px] h-3.5 -translate-x-1/2",
          direction === "up" && "top-[-7px] h-3.5 -translate-x-1/2",
          direction === "both" &&
            "top-1/2 h-5 -translate-x-1/2 -translate-y-1/2",
        )}
        style={
          {
            left: leftPct,
            backgroundColor: sampleColor,
          } as React.CSSProperties
        }
      />,
    );
  }
  return <>{els}</>;
}

const MeetingCard = memo(function MeetingCard({
  row,
  grid,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  courseColors,
  roomCapacityById,
  groupSizeById,
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

  return (
    <div
      className={clsx(
        "meeting relative z-[2] mb-1.5 flex min-h-[86px] cursor-pointer flex-col gap-1 overflow-hidden rounded-lg border p-[7px] pb-2 [contain:style] last:mb-0",
        "mb-0 h-full min-h-0",
        isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2),0_2px_10px_rgba(0,0,0,0.12)] outline outline-2 outline-[#1d3f70]",
        isSelected &&
          !isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2)] outline outline-2 outline-[#1d3f70]",
        !isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_1px_rgba(29,63,112,0.14)] outline outline-1 outline-[rgba(29,63,112,0.55)] outline-dashed",
        (grid.backToBackSources?.has(m.instance_id) ||
          grid.backToBackTargets?.has(m.instance_id)) &&
          "ring-1 ring-[#1d3f70]/25",
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      onClick={() => {
        selectMeeting(meetingSelectionKey(m), m.course || courseTitle);
      }}
    >
      <div
        className="subject line-clamp-3 min-w-0 text-[0.8125rem] leading-[1.08] font-bold [overflow-wrap:anywhere] text-[#1a2332]"
        title={`${courseTitle} (${m.tag})${count > 1 ? ` x${count}` : ""}`}
      >
        <span className="inline-flex max-w-full flex-wrap items-center gap-1">
          <span className="min-w-0">
            {courseTitle} ({m.tag}){count > 1 ? ` x${count}` : ""}
          </span>
          <MeetingOverrideFieldBadge
            field="weekday"
            fields={m.override_fields}
          />
          <MeetingOverrideFieldBadge field="time" fields={m.override_fields} />
        </span>
      </div>
      <div className="min-h-0 flex-1" />
      <div
        className="line w-full min-w-0 overflow-hidden text-[0.75rem] leading-[1.25] text-ellipsis whitespace-nowrap text-[#313b49]"
        title={(typeof m.instructors === "string"
          ? [m.instructors]
          : m.instructors
        ).join(" / ")}
      >
        <span className="inline-flex max-w-full items-center gap-1">
          <span className="min-w-0 truncate">
            {(typeof m.instructors === "string"
              ? [m.instructors]
              : m.instructors
            ).length
              ? (typeof m.instructors === "string"
                  ? [m.instructors]
                  : m.instructors
                ).map((name, idx) => (
                  <span key={name}>
                    <span
                      className="clickable inline cursor-pointer font-semibold text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid"
                      title={scheduleAssistantDetailTooltips.instructor}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        selectInstructorCell(name);
                      }}
                    >
                      {name}
                    </span>
                    {idx < (m.instructors?.length ?? 0) - 1 ? " / " : null}
                  </span>
                ))
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
          "line w-full min-w-0 overflow-hidden text-[0.75rem] leading-[1.25] text-ellipsis whitespace-nowrap",
          overCap ? "font-bold text-[#b42318]" : "text-[#313b49]",
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
          <MeetingOverrideFieldBadge field="room" fields={m.override_fields} />
        </span>
      </div>
    </div>
  );
}, meetingCardPropsEqual);

function renderUtilizationRows(args: {
  mode: "instructor" | "room";
  grid: BuiltGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
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
    ).sort();
    headerTitle = "Преподаватели";
  } else {
    resourceCols = Array.from(
      new Set(weekMeetings.map((m) => m.room).filter(Boolean)),
    ).sort();
    headerTitle = "Аудитории";
  }

  const rows: React.ReactNode[] = [];
  const thead = (
    <thead className="sticky top-0 z-[20]">
      <tr key="uh1">
        <th
          className="left-head sticky left-0 z-[25] w-[130px] min-w-[130px] border border-[#d8dfeb] bg-[#1f5fae] p-2 text-center [vertical-align:top] text-[0.8125rem] font-bold text-white"
          rowSpan={2}
        >
          День / время
        </th>
        <th
          className="year-head z-[8] border-t border-r border-b border-[#d8dfeb] bg-[#1f5fae] p-2 text-center [vertical-align:top] text-[0.875rem] font-bold text-white"
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
          return (
            <UtilResourceHeadCell
              key={col}
              resourceKey={col}
              label={mode === "room" ? `${col} (вм. ${cap ?? "-"})` : col}
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
          className="sticky top-[66px] z-[6] border-r border-b border-l border-[#d8dfeb] bg-[#edf4ff] p-2 [vertical-align:top] text-[0.875rem] font-bold tracking-[0.4px] text-[#1d3f70] uppercase"
          colSpan={resourceCols.length + 1}
        >
          <span className="day-label sticky left-[9px] z-[7] inline-block bg-[#edf4ff] pr-1">
            {day}
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
              className="link-cell relative w-[170px] max-w-[170px] min-w-[170px] border-r border-b border-[#d8dfeb] p-2 [vertical-align:top] align-top text-[0.75rem]"
            >
              <div className="empty h-full min-h-0 rounded-lg bg-[#fafcff]" />
            </td>
          );
        }

        const merged = mergedMeetingsForCell(matches);
        const hasSource = merged.some((r) =>
          grid.backToBackSources?.has(r.sample.instance_id),
        );
        const hasTarget = merged.some((r) =>
          grid.backToBackTargets?.has(r.sample.instance_id),
        );

        const connDir =
          hasSource && hasTarget ? "both" : hasSource ? "down" : "up";
        const connColor = colorBySubject(
          merged[0]?.sample?.course || "",
          courseColors,
        ).border;

        return (
          <td
            key={resource}
            className="link-cell relative w-[170px] max-w-[170px] min-w-[170px] border-r border-b border-[#d8dfeb] p-2 [vertical-align:top] align-top text-[0.75rem]"
          >
            {hasSource || hasTarget ? (
              <div
                className={clsx(
                  "cell-connector pointer-events-none absolute left-1/2 z-[1] w-0.5 rounded-full shadow-[0_0_0_1px_rgba(80,92,110,0.15)]",
                  connDir === "down" && "bottom-[-7px] h-3.5 -translate-x-1/2",
                  connDir === "up" && "top-[-7px] h-3.5 -translate-x-1/2",
                  connDir === "both" &&
                    "top-1/2 h-5 -translate-x-1/2 -translate-y-1/2",
                )}
                style={{ backgroundColor: connColor }}
              />
            ) : null}
            <div className="flex h-full min-h-0 flex-col gap-1.5">
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
                  />
                );
              })}
            </div>
          </td>
        );
      });

      rows.push(
        <tr
          key={`us-${day}-${slot.start}`}
          className="slot-row [&_.empty]:h-full [&_.empty]:min-h-[78px] [&_.meeting]:h-full [&_.meeting]:min-h-[86px] [&_td]:h-[116px]"
        >
          <td className="slot-cell sticky left-0 z-[4] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] p-2 text-center [vertical-align:top] text-[0.75rem] font-bold">
            {slot.label}
          </td>
          {cells}
        </tr>,
      );
    }
  }

  const utilColCount = Math.max(1, resourceCols.length);
  rows.push(
    <tr
      key="scroll-pad-util"
      className="slot-row [&_.empty]:h-full [&_.empty]:min-h-[78px] [&_.meeting]:h-full [&_.meeting]:min-h-[86px] [&_td]:h-[116px]"
      aria-hidden
    >
      <td className="slot-cell sticky left-0 z-[4] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] p-2 text-center [vertical-align:top] text-[0.75rem] font-bold" />
      {Array.from({ length: utilColCount }, (_, i) => (
        <td
          key={`scroll-pad-util-${resourceCols[i] ?? i}`}
          className="link-cell relative w-[170px] max-w-[170px] min-w-[170px] border-r border-b border-[#d8dfeb] bg-[#eef1f6] p-2 [vertical-align:top] align-top text-[0.75rem] [&_.empty]:bg-[#e9edf3]"
        >
          <div className="empty h-full min-h-0 min-h-[78px] rounded-lg bg-[#fafcff]" />
        </td>
      ))}
    </tr>,
  );

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
  grid,
  selectMeeting,
  selectInstructorCell,
  selectRoomCell,
  courseColors,
  roomCapacityById,
  groupSizeById,
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

  return (
    <div
      className={clsx(
        "meeting relative z-[2] mb-1.5 flex min-h-[86px] cursor-pointer flex-col gap-1 overflow-hidden rounded-lg border p-[7px] pb-2 [contain:style] last:mb-0",
        "mb-0 h-full min-h-0",
        isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2),0_2px_10px_rgba(0,0,0,0.12)] outline outline-2 outline-[#1d3f70]",
        isSelected &&
          !isRelated &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2)] outline outline-2 outline-[#1d3f70]",
        !isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_1px_rgba(29,63,112,0.14)] outline outline-1 outline-[rgba(29,63,112,0.55)] outline-dashed",
        (grid.backToBackSources?.has(m.instance_id) ||
          grid.backToBackTargets?.has(m.instance_id)) &&
          "ring-1 ring-[#1d3f70]/25",
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      onClick={() => {
        selectMeeting(meetingSelectionKey(m), m.course || courseTitle);
      }}
    >
      <div
        className="subject line-clamp-3 min-w-0 text-[0.8125rem] leading-[1.08] font-bold [overflow-wrap:anywhere] text-[#1a2332]"
        title={`${courseTitle} (${m.tag})${row.count > 1 ? ` x${row.count}` : ""}`}
      >
        {courseTitle} ({m.tag}){row.count > 1 ? ` x${row.count}` : ""}
      </div>
      <div className="min-h-0 flex-1" />
      <div
        className={clsx(
          "line w-full min-w-0 overflow-hidden text-[0.75rem] leading-[1.25] text-ellipsis whitespace-nowrap",
          overCap
            ? "!font-bold !text-[#b42318] [&_.clickable]:!text-[#b42318] [&_.clickable]:decoration-[#b42318]"
            : "text-[#313b49]",
        )}
        title={
          mode === "instructor"
            ? `${m.groups.join(", ")} | ${roomLoad}`
            : `${m.groups.join(", ")} | ${roomLoad} | заполн. ${roomFillPercent(m, roomCapacityById, groupSizeById)} | ${(typeof m.instructors === "string" ? [m.instructors] : m.instructors).join(" / ")}`
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
            | заполн. {roomFillPercent(m, roomCapacityById, groupSizeById)} |{" "}
            {(typeof m.instructors === "string"
              ? [m.instructors]
              : m.instructors
            ).length
              ? (typeof m.instructors === "string"
                  ? [m.instructors]
                  : m.instructors
                ).map((name, idx) => (
                  <span key={name}>
                    {idx > 0 ? " / " : null}
                    <span
                      className="clickable inline cursor-pointer font-semibold text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid"
                      title={scheduleAssistantDetailTooltips.instructor}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        selectInstructorCell(name);
                      }}
                    >
                      {name}
                    </span>
                  </span>
                ))
              : "-"}
          </>
        )}
      </div>
    </div>
  );
}, utilizationMeetingCardPropsEqual);
