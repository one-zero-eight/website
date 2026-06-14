import { useState } from "react";
import { cn } from "@/lib/ui/cn";

type MeetingDate = {
  id: string;
  monthDay: string;
  weekDay: string;
};

type MeetingUser = {
  id: string;
  name: string;
  slots: Set<string>;
};

type AvailabilityType = "available" | "if_needed";

const MEETING_DATES: MeetingDate[] = [
  { id: "2026-06-16", monthDay: "Jun 16", weekDay: "Tue" },
  { id: "2026-06-17", monthDay: "Jun 17", weekDay: "Wed" },
  { id: "2026-06-18", monthDay: "Jun 18", weekDay: "Thu" },
  { id: "2026-06-19", monthDay: "Jun 19", weekDay: "Fri" },
  { id: "2026-06-26", monthDay: "Jun 26", weekDay: "Fri" },
];

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

function getSlotKey(dateId: string, time: string) {
  return `${dateId}_${time}`;
}

interface AvailabilitySelectorProps {
  users: MeetingUser[];
  activeUserId: string;
  viewedUserIds: Set<string>;
  onToggleSlot: (dateId: string, time: string) => void;
  onAvailabilityTypeChange?: (type: AvailabilityType) => void;
  availabilityType?: AvailabilityType;
  isPhone?: boolean;
}

export function AvailabilitySelector({
  users,
  activeUserId,
  viewedUserIds,
  onToggleSlot,
  onAvailabilityTypeChange,
  availabilityType = "available",
  isPhone = false,
}: AvailabilitySelectorProps) {
  const [dateOffset, setDateOffset] = useState(0);
  // const [showBestTimes, setShowBestTimes] = useState(false);

  const viewedUsers = users.filter((user) => viewedUserIds.has(user.id));
  const activeUser = users.find((user) => user.id === activeUserId);
  const maxCount = Math.max(1, viewedUsers.length);

  const mobileDates = MEETING_DATES.slice(dateOffset, dateOffset + 3);
  const currentDates = isPhone ? mobileDates : MEETING_DATES;

  const hasPrevPage = dateOffset > 0;
  const hasNextPage = dateOffset < MEETING_DATES.length - 3;

  function getSlotCount(dateId: string, time: string) {
    const slotKey = getSlotKey(dateId, time);
    return viewedUsers.filter((user) => user.slots.has(slotKey)).length;
  }

  function getSlotTone(
    count: number,
    maxCount: number,
    type: AvailabilityType,
  ) {
    if (count === 0) {
      return "bg-base-100 hover:bg-primary/10";
    }

    const ratio = count / maxCount;

    if (type === "if_needed") {
      // Yellow tones for if_needed
      if (ratio >= 1) {
        return "bg-warning text-warning-content hover:bg-warning/90";
      }
      if (ratio >= 0.67) {
        return "bg-warning/70 hover:bg-warning/80";
      }
      if (ratio >= 0.34) {
        return "bg-warning/45 hover:bg-warning/55";
      }
      return "bg-warning/20 hover:bg-warning/30";
    }

    // Green tones for available
    if (ratio >= 1) {
      return "bg-primary text-primary-content hover:bg-primary/90";
    }
    if (ratio >= 0.67) {
      return "bg-primary/70 hover:bg-primary/80";
    }
    if (ratio >= 0.34) {
      return "bg-primary/45 hover:bg-primary/55";
    }
    return "bg-primary/20 hover:bg-primary/30";
  }

  return (
    <div className="w-full">
      {/* Header with date navigation for mobile */}
      {isPhone && (
        <div className="mb-3 flex items-center justify-between md:hidden">
          <div className="text-sm font-medium">
            {mobileDates[0].monthDay} -{" "}
            {mobileDates[mobileDates.length - 1].monthDay}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-circle btn-outline btn-sm"
              disabled={!hasPrevPage}
              onClick={() => setDateOffset((offset) => Math.max(0, offset - 1))}
            >
              <span className="icon-[material-symbols--chevron-left] text-xl" />
            </button>
            <button
              type="button"
              className="btn btn-circle btn-outline btn-sm"
              disabled={!hasNextPage}
              onClick={() =>
                setDateOffset((offset) =>
                  Math.min(MEETING_DATES.length - 3, offset + 1),
                )
              }
            >
              <span className="icon-[material-symbols--chevron-right] text-xl" />
            </button>
          </div>
        </div>
      )}

      {/* Availability Type Toggle */}
      {onAvailabilityTypeChange && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={cn(
              "btn btn-sm flex-1",
              availabilityType === "available"
                ? "btn-primary"
                : "btn-outline btn-primary/50",
            )}
            onClick={() => onAvailabilityTypeChange("available")}
          >
            <span className="bg-primary-content h-2.5 w-2.5 rounded-full" />
            Available
          </button>
          <button
            type="button"
            className={cn(
              "btn btn-sm flex-1",
              availabilityType === "if_needed"
                ? "btn-warning"
                : "btn-outline btn-warning/50",
            )}
            onClick={() => onAvailabilityTypeChange("if_needed")}
          >
            <span className="bg-warning-content h-2.5 w-2.5 rounded-full" />
            If needed
          </button>
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div
          className={cn(
            "grid min-w-[700px] grid-cols-[4.25rem_repeat(5,minmax(7rem,1fr))]",
            !isPhone && "md:grid-cols-[4.25rem_repeat(5,minmax(7rem,1fr))]",
            isPhone && "grid-cols-[3.5rem_repeat(3,minmax(5.5rem,1fr))]",
          )}
        >
          {/* Header row */}
          <div />
          {currentDates.map((date) => (
            <div key={date.id} className="pb-3 text-center">
              <div className="text-base-content/70 text-sm md:text-base">
                {date.monthDay}
              </div>
              <div className="text-xl font-medium md:text-3xl">
                {date.weekDay}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {TIME_SLOTS.map((time) => (
            <div key={time} className="contents">
              <div
                className={cn(
                  "text-base-content/80 h-8 pr-2 text-right text-sm md:text-xl",
                  time.endsWith(":30") && "text-transparent",
                )}
              >
                {time}
              </div>
              {currentDates.map((date) => {
                const slotKey = getSlotKey(date.id, time);
                const slotCount = getSlotCount(date.id, time);
                const isActiveUserSlot = activeUser?.slots.has(slotKey);

                return (
                  <button
                    key={slotKey}
                    type="button"
                    className={cn(
                      "border-base-300 h-8 border-t border-r border-dashed transition-colors first:border-l",
                      time.endsWith(":00") && "border-solid",
                      getSlotTone(slotCount, maxCount, availabilityType),
                      isActiveUserSlot &&
                        "ring-primary ring-2 ring-offset-0 ring-inset",
                    )}
                    title={`${date.monthDay}, ${time}: ${slotCount} responses`}
                    onClick={() => onToggleSlot(date.id, time)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Color Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary h-3 w-3 rounded" />
          <span className="text-base-content/70">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-warning h-3 w-3 rounded" />
          <span className="text-base-content/70">If needed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-base-100 border-base-300 h-3 w-3 rounded border border-dashed" />
          <span className="text-base-content/70">Empty</span>
        </div>
      </div>
    </div>
  );
}
