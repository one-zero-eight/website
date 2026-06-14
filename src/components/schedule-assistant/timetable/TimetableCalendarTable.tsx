import { cn } from "@/lib/ui/cn";
import { memo } from "react";

import {
  MEETING_CALENDAR_GROUPS_LIMIT,
  meetingCalendarGroupsLabel,
  meetingCalendarMainLabel,
  type BuiltCalendarGrid,
  type CalendarWeekBlock,
} from "./timetableCalendarModel.ts";
import {
  meetingSelectionKey,
  WEEK_RELATIVE_BADGE_CLASS,
  WEEK_RELATIVE_LABELS,
  type Meeting,
  type Selection,
} from "./timetableViewerModel.ts";

const CALENDAR_TIME_COL_WIDTH = "130px";
const CALENDAR_DAY_COL_WIDTH = "7.5rem";
const CALENDAR_WEEK_TITLE_TOP = "top-0";
const CALENDAR_DAY_HEAD_TOP = "top-14";
const CALENDAR_DATE_TOP = "top-[6.75rem]";

const CALENDAR_ROW = {
  weekTitle: "min-h-14",
  dayHead: "min-h-[2.25rem]",
  date: "min-h-[2rem]",
  slot: "min-h-[3.25rem]",
} as const;

function calendarDayGridTemplateColumns(dayCount: number) {
  return `repeat(${dayCount}, ${CALENDAR_DAY_COL_WIDTH})`;
}

function calendarStickyTopClass(topClass: string) {
  return cn("sticky z-[10]", topClass);
}

function calendarLeftRailCellClass({
  corner = false,
  topClass,
}: {
  corner?: boolean;
  topClass?: string;
} = {}) {
  return cn(
    "border-base-300 border p-2",
    corner ? "bg-base-100" : "bg-base-200",
    topClass ? calendarStickyTopClass(topClass) : null,
  );
}

function CalendarMeetingEntry({
  meeting,
  selection,
  onSelectMeeting,
}: {
  meeting: Meeting;
  selection: Selection;
  onSelectMeeting: (valueKey: string, course: string) => void;
}) {
  const courseTitle = String(meeting.course || "").trim() || "—";
  const key = meetingSelectionKey(meeting);
  const mainLabel = meetingCalendarMainLabel(meeting);
  const groupsLabel = meetingCalendarGroupsLabel(meeting);
  const allGroups = (meeting.groups || []).filter(Boolean);
  const isSelected = selection?.type === "meeting" && selection.value === key;
  const isRelated =
    selection?.type === "meeting" &&
    selection.course === (meeting.course || courseTitle);

  return (
    <button
      type="button"
      className={cn(
        "meeting text-base-content block w-full cursor-pointer px-0.5 py-0 text-center text-[0.6875rem] leading-tight font-semibold [overflow-wrap:anywhere]",
        isSelected && "text-primary underline decoration-2 underline-offset-2",
        !isSelected && isRelated && "text-primary/80",
        !isSelected && !isRelated && "hover:text-primary hover:underline",
      )}
      onClick={() => onSelectMeeting(key, meeting.course || courseTitle)}
      title={
        groupsLabel && allGroups.length > MEETING_CALENDAR_GROUPS_LIMIT
          ? `${mainLabel} (${allGroups.join(", ")})`
          : undefined
      }
    >
      {mainLabel}
      {groupsLabel ? (
        <>
          {" "}
          <span className="text-base-content/50 font-normal">
            ({groupsLabel})
          </span>
        </>
      ) : null}
    </button>
  );
}

function CalendarWeekLeftRail({
  week,
  calendarGrid,
}: {
  week: CalendarWeekBlock;
  calendarGrid: BuiltCalendarGrid;
}) {
  return (
    <div
      className="week-title-row"
      data-current-week={week.weekRelative === "current" || undefined}
    >
      <div
        className={cn(
          calendarLeftRailCellClass({
            corner: true,
            topClass: CALENDAR_WEEK_TITLE_TOP,
          }),
          CALENDAR_ROW.weekTitle,
        )}
      />
      <div
        className={cn(
          calendarLeftRailCellClass({ topClass: CALENDAR_DAY_HEAD_TOP }),
          CALENDAR_ROW.dayHead,
        )}
      />
      <div
        className={cn(
          calendarLeftRailCellClass({ topClass: CALENDAR_DATE_TOP }),
          CALENDAR_ROW.date,
        )}
      />
      {calendarGrid.slots.map((slot) => (
        <div
          key={`${week.key}-${slot.start}-time`}
          className={cn(
            calendarLeftRailCellClass(),
            CALENDAR_ROW.slot,
            "text-base-content text-center text-xs font-bold whitespace-nowrap",
          )}
        >
          {slot.label}
        </div>
      ))}
    </div>
  );
}

function CalendarWeekDaysGrid({
  week,
  calendarGrid,
  selection,
  selectMeeting,
  clearSelection,
}: {
  week: CalendarWeekBlock;
  calendarGrid: BuiltCalendarGrid;
  selection: Selection;
  selectMeeting: (valueKey: string, course: string) => void;
  clearSelection: () => void;
}) {
  const dayCount = week.days.length;

  return (
    <div
      className="border-base-300 grid w-max border-separate border-spacing-0"
      style={{
        gridTemplateColumns: calendarDayGridTemplateColumns(dayCount),
      }}
    >
      <div
        className={cn(
          "border-base-300 bg-base-100 border p-2",
          CALENDAR_ROW.weekTitle,
          calendarStickyTopClass(CALENDAR_WEEK_TITLE_TOP),
        )}
        style={{ gridColumn: `1 / span ${dayCount}` }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base-content text-sm font-bold">
            {week.weekLabel}
          </span>
          <span className="text-base-content/70 text-sm">
            {week.weekRangeLabel}
          </span>
          <span
            className={cn(
              "badge badge-xs shrink-0",
              WEEK_RELATIVE_BADGE_CLASS[week.weekRelative],
            )}
          >
            {WEEK_RELATIVE_LABELS[week.weekRelative]} неделя
          </span>
        </div>
      </div>

      {week.days.map((day) => (
        <div
          key={`${week.key}-${day.key}-head`}
          className={cn(
            "border-base-300 bg-base-200 border p-2 text-center text-sm font-bold",
            CALENDAR_ROW.dayHead,
            calendarStickyTopClass(CALENDAR_DAY_HEAD_TOP),
            day.isToday ? "text-success" : "text-base-content",
          )}
        >
          {day.headerLabel}
        </div>
      ))}

      {week.days.map((day) => (
        <div
          key={`${week.key}-${day.key}-date`}
          className={cn(
            "border-base-300 bg-base-200 border p-1.5 text-center text-xs font-medium",
            CALENDAR_ROW.date,
            calendarStickyTopClass(CALENDAR_DATE_TOP),
            day.isToday ? "text-success" : "text-base-content/70",
          )}
        >
          {day.dateLabel}
        </div>
      ))}

      {calendarGrid.slots.map((slot) => (
        <div
          key={`${week.key}-${slot.start}`}
          className="calendar-slot-row contents"
        >
          {week.days.map((day) => {
            const cellMeetings =
              calendarGrid.cells.get(`${day.date}|${slot.start}`) || [];

            return (
              <div
                key={`${week.key}-${day.key}-${slot.start}`}
                className={cn(
                  "border-base-300 border p-1",
                  CALENDAR_ROW.slot,
                  day.isToday ? "bg-success/10" : "bg-base-100",
                )}
                onClick={cellMeetings.length ? undefined : clearSelection}
              >
                {cellMeetings.length ? (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    {cellMeetings.map((meeting) => (
                      <CalendarMeetingEntry
                        key={meeting.instance_id}
                        meeting={meeting}
                        selection={selection}
                        onSelectMeeting={selectMeeting}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export const TimetableCalendarTable = memo(function TimetableCalendarTable({
  calendarGrid,
  selection,
  selectMeeting,
  clearSelection,
}: {
  calendarGrid: BuiltCalendarGrid;
  selection: Selection;
  selectMeeting: (valueKey: string, course: string) => void;
  clearSelection: () => void;
}) {
  return (
    <div id="calendar-table" className="flex min-h-full w-full min-w-0">
      <div
        className="border-base-300 bg-base-200 shrink-0 border-r [box-shadow:1px_0_0_0_var(--color-base-300)]"
        style={{ width: CALENDAR_TIME_COL_WIDTH }}
      >
        {calendarGrid.weeks.map((week) => (
          <CalendarWeekLeftRail
            key={`${week.key}-rail`}
            week={week}
            calendarGrid={calendarGrid}
          />
        ))}
      </div>

      <div
        id="calendar-days-scroll"
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
      >
        <div className="flex w-max min-w-full flex-col">
          {calendarGrid.weeks.map((week) => (
            <CalendarWeekDaysGrid
              key={week.key}
              week={week}
              calendarGrid={calendarGrid}
              selection={selection}
              selectMeeting={selectMeeting}
              clearSelection={clearSelection}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
