import { cn } from "@/lib/ui/cn";
import { Fragment, memo } from "react";

import {
  MEETING_CALENDAR_GROUPS_LIMIT,
  meetingCalendarGroupsLabel,
  meetingCalendarMainLabel,
  type BuiltCalendarGrid,
} from "./timetableCalendarModel.ts";
import {
  meetingSelectionKey,
  WEEK_RELATIVE_BADGE_CLASS,
  WEEK_RELATIVE_LABELS,
  type Meeting,
  type Selection,
} from "./timetableViewerModel.ts";

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
  const groupsLabel = meetingCalendarGroupsLabel(meeting.groups);
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
  const dayCount = calendarGrid.weeks[0]?.days.length ?? 0;

  return (
    <table
      id="calendar-table"
      className="border-base-300 w-max min-w-full border-separate border-spacing-0 text-[0.8125rem]"
    >
      <tbody>
        {calendarGrid.weeks.map((week) => (
          <Fragment key={week.key}>
            <tr
              className="week-title-row"
              data-current-week={week.weekRelative === "current" || undefined}
            >
              <td
                className="border-base-300 bg-base-100 border p-2"
                colSpan={dayCount + 1}
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
              </td>
            </tr>
            <tr>
              <td className="border-base-300 bg-base-200 sticky left-0 z-[6] border p-2" />
              {week.days.map((day) => (
                <td
                  key={`${week.key}-${day.key}-head`}
                  className={cn(
                    "border-base-300 min-w-[7.5rem] border p-2 text-center text-sm font-bold",
                    day.isToday
                      ? "bg-primary/20 text-primary"
                      : "bg-base-200 text-base-content",
                  )}
                >
                  {day.headerLabel}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border-base-300 bg-base-200 sticky left-0 z-[6] border p-2" />
              {week.days.map((day) => (
                <td
                  key={`${week.key}-${day.key}-date`}
                  className={cn(
                    "border-base-300 border p-1.5 text-center text-xs font-medium",
                    day.isToday
                      ? "bg-primary/20 text-primary"
                      : "bg-base-200 text-base-content/70",
                  )}
                >
                  {day.dateLabel}
                </td>
              ))}
            </tr>
            {calendarGrid.slots.map((slot) => (
              <tr
                key={`${week.key}-${slot.start}`}
                className="calendar-slot-row"
              >
                <td className="border-base-300 bg-base-200 text-base-content sticky left-0 z-[4] border p-2 text-center text-xs font-bold whitespace-nowrap">
                  {slot.label}
                </td>
                {week.days.map((day) => {
                  const cellMeetings =
                    calendarGrid.cells.get(`${day.date}|${slot.start}`) || [];

                  return (
                    <td
                      key={`${week.key}-${day.key}-${slot.start}`}
                      className={cn(
                        "border-base-300 min-h-[3.25rem] min-w-[7.5rem] border p-1 align-top",
                        day.isToday ? "bg-primary/10" : "bg-base-100",
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
});
