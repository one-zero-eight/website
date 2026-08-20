import { cn } from "@/lib/ui/cn";
import { Fragment, memo } from "react";

import {
  meetingCalendarCellLabel,
  meetingCalendarGroupsLabel,
  meetingCalendarMainLabel,
  type BuiltCalendarGrid,
  type CalendarWeekBlock,
} from "./timetableCalendarModel.ts";
import { useMeetingHighlightBits } from "./timetableSelectionStore.ts";
import {
  todayCalendarColumnBodyClass,
  todayCalendarColumnHeadClass,
} from "./timetableTodayHighlight.ts";
import {
  colorBySubject,
  meetingSelectionKey,
  type Meeting,
} from "./timetableViewerModel.ts";
import type { CreateMeetingCellContext } from "./createMeetingUtils.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import type { UnarrangedLessonItem } from "./unarrangedLessons.ts";

const CALENDAR_TIME_COL_WIDTH = "w-[130px] min-w-[130px] max-w-[130px]";
const CALENDAR_DAY_COL_WIDTH = "w-[170px] min-w-[170px] max-w-[170px]";
const CALENDAR_TABLE_CLASS =
  "calendar-week-table isolate w-max min-w-full table-fixed border-separate border-spacing-0";
const CALENDAR_HEAD_ROW_CLASS = "h-12";
/** h-12 + нижняя граница шапки */
const CALENDAR_STICKY_SLOT_TOP_CLASS = "top-[calc(3rem+1px)]";
/** Approx. week block height hint for content-visibility. */
const CALENDAR_WEEK_SHELL_CLASS =
  "[content-visibility:auto] [contain-intrinsic-size:auto_800px]";

const CalendarMeetingCard = memo(function CalendarMeetingCard({
  meeting,
  courseColors,
  onSelectMeeting,
  onOpenMeetingEdit,
  disableSelect = false,
}: {
  meeting: Meeting;
  courseColors: Record<string, { bg: string; border: string }>;
  onSelectMeeting: (
    valueKey: string,
    course: string,
    focusTag?: string,
  ) => void;
  onOpenMeetingEdit: (meeting: Meeting) => void;
  disableSelect?: boolean;
}) {
  const courseTitle = String(meeting.course || "").trim() || "—";
  const key = meetingSelectionKey(meeting);
  const mainLabel = meetingCalendarMainLabel(meeting);
  const groupsLabel = meetingCalendarGroupsLabel(meeting);
  const colors = colorBySubject(meeting.course || courseTitle, courseColors);
  const bits = useMeetingHighlightBits(meeting);
  const isSelected = (bits & 1) !== 0;
  const isRelated = (bits & 2) !== 0;
  const canEdit = !!parseMeetingInstanceId(meeting.instance_id);

  return (
    <button
      type="button"
      data-meeting-id={meeting.instance_id}
      className={cn(
        "meeting block w-full min-w-0 truncate rounded border px-1 py-px text-left text-[0.6875rem] leading-tight text-[#1a2332]",
        disableSelect && "pointer-events-none",
        isSelected &&
          "shadow-[inset_0_0_0_2px_rgba(29,63,112,0.2)] outline-2 outline-[#1d3f70]",
        !isSelected &&
          isRelated &&
          "shadow-[inset_0_0_0_1px_rgba(29,63,112,0.14)] outline outline-[rgba(29,63,112,0.55)] outline-dashed",
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      onClick={() => {
        if (disableSelect) return;
        onSelectMeeting(key, meeting.course || courseTitle, meeting.tag);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (disableSelect || !canEdit) return;
        onOpenMeetingEdit(meeting);
      }}
      title={meetingCalendarCellLabel(meeting, null)}
    >
      {meeting.off_grid ? (
        <span className="block truncate text-[0.625rem] font-semibold text-[#8a6d3b]">
          {meeting.start}
          {meeting.end ? `–${meeting.end}` : ""}
        </span>
      ) : null}
      <span className="font-semibold">{mainLabel}</span>
      {groupsLabel ? (
        <span className="font-normal text-[#4f5c6d]"> ({groupsLabel})</span>
      ) : null}
    </button>
  );
});

function CalendarAddSlotButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center rounded bg-[#f3f7ff] px-1 py-0.5 text-[0.8125rem] leading-none font-semibold text-[#1d3f70] opacity-50 hover:bg-[#e4edff] hover:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      +
    </button>
  );
}

function CalendarPlaceGhost({
  label,
  room,
  instructor,
  colors,
}: {
  label: string;
  room?: string;
  instructor?: string;
  colors: { bg: string; border: string };
}) {
  const roomLabel = String(room || "").trim();
  const instructorLabel = String(instructor || "").trim();
  return (
    <div
      className="meeting ring-dashed pointer-events-none block w-full min-w-0 rounded border px-1 py-px text-left text-[0.6875rem] leading-tight text-[#1a2332] opacity-70 ring-2 ring-[#1d3f70]/55 ring-inset"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <span className="block truncate font-semibold" title={label}>
        {label}
      </span>
      <span
        className="block truncate text-[0.625rem] font-semibold text-[#4f5c6d]"
        title={instructorLabel || undefined}
      >
        {instructorLabel || "—"}
      </span>
      <span
        className="block truncate text-[0.625rem] font-semibold text-[#4f5c6d]"
        title={roomLabel || undefined}
      >
        {roomLabel || "—"}
      </span>
    </div>
  );
}

function CalendarWeekHeader({ week }: { week: CalendarWeekBlock }) {
  return (
    <thead className="sticky top-0 z-20 shadow-[0_1px_0_#d8dfeb]">
      <tr
        className="calendar-week-head-row"
        data-current-week={week.weekRelative === "current" || undefined}
      >
        <th
          className={cn(
            CALENDAR_TIME_COL_WIDTH,
            "left-head sticky left-0 z-30 border border-[#d8dfeb] bg-[#1f5fae] px-1.5 py-1 text-center align-middle text-[0.6875rem] leading-tight font-bold text-white",
            CALENDAR_HEAD_ROW_CLASS,
          )}
        >
          <div className="flex w-full flex-col items-center gap-0.5 leading-tight">
            <span className="w-full truncate">{week.weekLabel}</span>
            <span className="w-full truncate text-[0.625rem] font-normal text-white/75">
              {week.weekRangeLabel}
            </span>
          </div>
        </th>
        {week.days.map((day) => (
          <th
            key={`${week.key}-${day.key}-head`}
            className={cn(
              CALENDAR_DAY_COL_WIDTH,
              "border-t border-r border-b border-[#d8dfeb] bg-[#edf4ff] px-1 py-0.5 text-center align-middle text-[0.6875rem] leading-tight font-medium text-[#1d3f70]",
              CALENDAR_HEAD_ROW_CLASS,
              todayCalendarColumnHeadClass(day.isToday),
            )}
          >
            <span className="block truncate text-[0.625rem] font-semibold text-[#2d77cc]">
              {day.headerLabel}
            </span>
            <span className="block truncate">{day.dateLabel}</span>
          </th>
        ))}
      </tr>
    </thead>
  );
}

const CalendarWeekTable = memo(function CalendarWeekTable({
  week,
  calendarGrid,
  courseColors,
  selectMeeting,
  openMeetingEdit,
  clearSelection,
  onEmptyCellClick,
  placeTarget,
  placeGhostRoom,
  placeGhostInstructor,
  hoverPlaceCell,
  onHoverPlaceCell,
}: {
  week: CalendarWeekBlock;
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selectMeeting: (valueKey: string, course: string, focusTag?: string) => void;
  openMeetingEdit: (meeting: Meeting) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
  placeTarget: UnarrangedLessonItem | null;
  placeGhostRoom?: string;
  placeGhostInstructor?: string;
  hoverPlaceCell: CreateMeetingCellContext | null;
  onHoverPlaceCell?: (context: CreateMeetingCellContext | null) => void;
}) {
  const ghostColors = placeTarget
    ? colorBySubject(
        placeTarget.courseName || placeTarget.shortName,
        courseColors,
      )
    : null;

  return (
    <table className={CALENDAR_TABLE_CLASS}>
      <CalendarWeekHeader week={week} />
      <tbody>
        {calendarGrid.slots.map((slot, slotIndex) => (
          <tr key={`${week.key}-${slot.start}`} className="slot-row">
            <td
              className={cn(
                CALENDAR_TIME_COL_WIDTH,
                "slot-cell sticky left-0 z-[15] border-r border-b border-l border-[#d8dfeb] bg-[#f1f6ff] p-0 align-top",
              )}
            >
              <div
                className={cn(
                  "sticky z-20 box-border w-full bg-[#f1f6ff] px-2 py-1 text-center text-[0.6875rem] leading-snug font-bold whitespace-nowrap text-[#1d3f70]",
                  CALENDAR_STICKY_SLOT_TOP_CLASS,
                )}
              >
                {slot.label}
              </div>
            </td>
            {week.days.map((day) => {
              const cellMeetings =
                calendarGrid.cells.get(`${day.date}|${slot.start}`) || [];
              const isLastSlot = slotIndex === calendarGrid.slots.length - 1;
              const createContext: CreateMeetingCellContext = {
                weekday: day.day,
                time: slot.start,
                date: day.date,
              };
              const showGhost =
                !!placeTarget &&
                !!ghostColors &&
                !!hoverPlaceCell &&
                hoverPlaceCell.weekday === createContext.weekday &&
                hoverPlaceCell.time === createContext.time &&
                hoverPlaceCell.date === createContext.date;

              const canPlaceHere = !!placeTarget;
              const canCreateHere = !placeTarget && !cellMeetings.length;

              return (
                <td
                  key={`${week.key}-${day.key}-${slot.start}`}
                  className={cn(
                    CALENDAR_DAY_COL_WIDTH,
                    "link-cell relative border-r border-b border-[#d8dfeb] bg-[#fafcff] p-0.5 align-top text-[0.6875rem] leading-tight",
                    todayCalendarColumnBodyClass(day.isToday, isLastSlot),
                    (canCreateHere && onEmptyCellClick) || canPlaceHere
                      ? "cursor-pointer hover:bg-[#eef4ff]"
                      : null,
                    showGhost && "bg-[#eef4ff]",
                  )}
                  onMouseEnter={() => {
                    if (!canPlaceHere || !onHoverPlaceCell) return;
                    onHoverPlaceCell(createContext);
                  }}
                  onMouseLeave={() => {
                    if (!canPlaceHere || !onHoverPlaceCell) return;
                    onHoverPlaceCell(null);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (placeTarget) {
                      if (!canPlaceHere || !onEmptyCellClick) return;
                      onEmptyCellClick(createContext);
                      return;
                    }
                    if (cellMeetings.length) return;
                    if (!onEmptyCellClick) {
                      clearSelection();
                      return;
                    }
                    onEmptyCellClick(createContext);
                  }}
                >
                  {cellMeetings.length ? (
                    <div className="flex flex-col gap-1">
                      {cellMeetings.map((meeting) => (
                        <CalendarMeetingCard
                          key={meeting.instance_id}
                          meeting={meeting}
                          courseColors={courseColors}
                          onSelectMeeting={selectMeeting}
                          onOpenMeetingEdit={openMeetingEdit}
                          disableSelect={canPlaceHere}
                        />
                      ))}
                      {onEmptyCellClick ? (
                        placeTarget && showGhost && ghostColors ? (
                          <CalendarPlaceGhost
                            label={placeTarget.label}
                            room={placeGhostRoom}
                            instructor={placeGhostInstructor}
                            colors={ghostColors}
                          />
                        ) : (
                          <CalendarAddSlotButton
                            onClick={() => onEmptyCellClick(createContext)}
                          />
                        )
                      ) : null}
                    </div>
                  ) : showGhost ? (
                    <CalendarPlaceGhost
                      label={placeTarget!.label}
                      room={placeGhostRoom}
                      instructor={placeGhostInstructor}
                      colors={ghostColors!}
                    />
                  ) : (
                    <div className="empty min-h-4" />
                  )}
                </td>
              );
            })}{" "}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

function CalendarStackedTable({
  calendarGrid,
  courseColors,
  selectMeeting,
  openMeetingEdit,
  clearSelection,
  onEmptyCellClick,
  placeTarget,
  placeGhostRoom,
  placeGhostInstructor,
  hoverPlaceCell,
  onHoverPlaceCell,
}: {
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selectMeeting: (valueKey: string, course: string, focusTag?: string) => void;
  openMeetingEdit: (meeting: Meeting) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
  placeTarget: UnarrangedLessonItem | null;
  placeGhostRoom?: string;
  placeGhostInstructor?: string;
  hoverPlaceCell: CreateMeetingCellContext | null;
  onHoverPlaceCell?: (context: CreateMeetingCellContext | null) => void;
}) {
  const weeks = calendarGrid.weeks;

  // Mount all weeks. Sliding-window virtualization fights variable elective
  // week heights (flicker / blank gaps on scroll). A term is ~15–20 weeks.
  return (
    <div id="calendar-table" className="flex w-max min-w-full flex-col">
      {weeks.map((week, weekIndex) => (
        <Fragment key={week.key}>
          <div
            className={CALENDAR_WEEK_SHELL_CLASS}
            data-calendar-week-index={weekIndex}
            data-calendar-week-start={week.days[0]?.date}
            data-calendar-week-end={week.days.at(-1)?.date}
          >
            <CalendarWeekTable
              week={week}
              calendarGrid={calendarGrid}
              courseColors={courseColors}
              selectMeeting={selectMeeting}
              openMeetingEdit={openMeetingEdit}
              clearSelection={clearSelection}
              onEmptyCellClick={onEmptyCellClick}
              placeTarget={placeTarget}
              placeGhostRoom={placeGhostRoom}
              placeGhostInstructor={placeGhostInstructor}
              hoverPlaceCell={hoverPlaceCell}
              onHoverPlaceCell={onHoverPlaceCell}
            />
          </div>
          {weekIndex < weeks.length - 1 ? (
            <div className="h-px shrink-0 bg-[#d8dfeb]" />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

export const TimetableCalendarTable = memo(function TimetableCalendarTable({
  calendarGrid,
  courseColors,
  selectMeeting,
  openMeetingEdit,
  clearSelection,
  onEmptyCellClick,
  placeTarget = null,
  placeGhostRoom,
  placeGhostInstructor,
  hoverPlaceCell = null,
  onHoverPlaceCell,
}: {
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selectMeeting: (valueKey: string, course: string, focusTag?: string) => void;
  openMeetingEdit: (meeting: Meeting) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
  placeTarget?: UnarrangedLessonItem | null;
  placeGhostRoom?: string;
  placeGhostInstructor?: string;
  hoverPlaceCell?: CreateMeetingCellContext | null;
  onHoverPlaceCell?: (context: CreateMeetingCellContext | null) => void;
}) {
  if (!calendarGrid.weeks.length) return null;

  return (
    <CalendarStackedTable
      calendarGrid={calendarGrid}
      courseColors={courseColors}
      selectMeeting={selectMeeting}
      openMeetingEdit={openMeetingEdit}
      clearSelection={clearSelection}
      onEmptyCellClick={onEmptyCellClick}
      placeTarget={placeTarget}
      placeGhostRoom={placeGhostRoom}
      placeGhostInstructor={placeGhostInstructor}
      hoverPlaceCell={hoverPlaceCell}
      onHoverPlaceCell={onHoverPlaceCell}
    />
  );
});
