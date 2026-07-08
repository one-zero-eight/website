import { cn } from "@/lib/ui/cn";
import { Fragment, memo } from "react";

import {
  meetingCalendarCellLabel,
  meetingCalendarGroupsLabel,
  meetingCalendarMainLabel,
  type BuiltCalendarGrid,
  type CalendarWeekBlock,
} from "./timetableCalendarModel.ts";
import {
  todayCalendarColumnBodyClass,
  todayCalendarColumnHeadClass,
} from "./timetableTodayHighlight.ts";
import {
  colorBySubject,
  meetingSelectionKey,
  type Meeting,
  type Selection,
} from "./timetableViewerModel.ts";
import type { CreateMeetingCellContext } from "./createMeetingUtils.ts";

const CALENDAR_TIME_COL_WIDTH = "w-[130px] min-w-[130px] max-w-[130px]";
const CALENDAR_DAY_COL_WIDTH = "w-[170px] min-w-[170px] max-w-[170px]";
const CALENDAR_TABLE_CLASS =
  "calendar-week-table isolate w-max min-w-full table-fixed border-separate border-spacing-0";
const CALENDAR_HEAD_ROW_CLASS = "h-12";
/** h-12 + нижняя граница шапки */
const CALENDAR_STICKY_SLOT_TOP_CLASS = "top-[calc(3rem+1px)]";

function CalendarMeetingCard({
  meeting,
  selection,
  courseColors,
  onSelectMeeting,
}: {
  meeting: Meeting;
  selection: Selection;
  courseColors: Record<string, { bg: string; border: string }>;
  onSelectMeeting: (valueKey: string, course: string) => void;
}) {
  const courseTitle = String(meeting.course || "").trim() || "—";
  const key = meetingSelectionKey(meeting);
  const mainLabel = meetingCalendarMainLabel(meeting);
  const groupsLabel = meetingCalendarGroupsLabel(meeting);
  const colors = colorBySubject(meeting.course || courseTitle, courseColors);
  const isSelected = selection?.type === "meeting" && selection.value === key;
  const isRelated =
    selection?.type === "meeting" &&
    selection.course === (meeting.course || courseTitle);

  return (
    <button
      type="button"
      data-meeting-id={meeting.instance_id}
      className={cn(
        "meeting block w-full min-w-0 truncate rounded border px-1 py-px text-left text-[0.6875rem] leading-tight text-[#1a2332]",
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
      onClick={() => onSelectMeeting(key, meeting.course || courseTitle)}
      title={meetingCalendarCellLabel(meeting, null)}
    >
      <span className="font-semibold">{mainLabel}</span>
      {groupsLabel ? (
        <span className="font-normal text-[#4f5c6d]"> ({groupsLabel})</span>
      ) : null}
    </button>
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

function CalendarWeekTable({
  week,
  calendarGrid,
  courseColors,
  selection,
  selectMeeting,
  clearSelection,
  onEmptyCellClick,
}: {
  week: CalendarWeekBlock;
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selection: Selection;
  selectMeeting: (valueKey: string, course: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
}) {
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

              return (
                <td
                  key={`${week.key}-${day.key}-${slot.start}`}
                  className={cn(
                    CALENDAR_DAY_COL_WIDTH,
                    "link-cell relative border-r border-b border-[#d8dfeb] bg-white p-0.5 align-top text-[0.6875rem] leading-tight",
                    todayCalendarColumnBodyClass(day.isToday, isLastSlot),
                    !cellMeetings.length &&
                      onEmptyCellClick &&
                      "cursor-pointer hover:bg-[#eef4ff]",
                  )}
                  onClick={(event) => {
                    if (cellMeetings.length) return;
                    event.stopPropagation();
                    if (!onEmptyCellClick) {
                      clearSelection();
                      return;
                    }
                    onEmptyCellClick({
                      weekday: day.day,
                      time: slot.start,
                      date: day.date,
                    });
                  }}
                >
                  {cellMeetings.length ? (
                    <div className="flex flex-col gap-px">
                      {cellMeetings.map((meeting) => (
                        <CalendarMeetingCard
                          key={meeting.instance_id}
                          meeting={meeting}
                          selection={selection}
                          courseColors={courseColors}
                          onSelectMeeting={selectMeeting}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty min-h-4 bg-[#fafcff]" />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarStackedTable({
  calendarGrid,
  courseColors,
  selection,
  selectMeeting,
  clearSelection,
  onEmptyCellClick,
}: {
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selection: Selection;
  selectMeeting: (valueKey: string, course: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
}) {
  return (
    <div id="calendar-table" className="flex w-max min-w-full flex-col">
      {calendarGrid.weeks.map((week, weekIndex) => (
        <Fragment key={week.key}>
          <CalendarWeekTable
            week={week}
            calendarGrid={calendarGrid}
            courseColors={courseColors}
            selection={selection}
            selectMeeting={selectMeeting}
            clearSelection={clearSelection}
            onEmptyCellClick={onEmptyCellClick}
          />
          {weekIndex < calendarGrid.weeks.length - 1 ? (
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
  selection,
  selectMeeting,
  clearSelection,
  onEmptyCellClick,
}: {
  calendarGrid: BuiltCalendarGrid;
  courseColors: Record<string, { bg: string; border: string }>;
  selection: Selection;
  selectMeeting: (valueKey: string, course: string) => void;
  clearSelection: () => void;
  onEmptyCellClick?: (context: CreateMeetingCellContext) => void;
}) {
  if (!calendarGrid.weeks.length) return null;

  return (
    <CalendarStackedTable
      calendarGrid={calendarGrid}
      courseColors={courseColors}
      selection={selection}
      selectMeeting={selectMeeting}
      clearSelection={clearSelection}
      onEmptyCellClick={onEmptyCellClick}
    />
  );
});
