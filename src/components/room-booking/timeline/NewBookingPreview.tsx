import { clockTime, durationFormatted, msBetween } from "@/lib/utils/dates";
import { msToPx } from "./utils";
import type { Slot } from "./types";

const NEW_BOOKING_BOX_ID = "new-booking-box";

export { NEW_BOOKING_BOX_ID };

export function NewBookingPreview({
  slot,
  scrollX,
  timelineStart,
  pixelsPerMinute,
  sidebarWidth,
  headerHeight,
  rowHeight,
  bodyHeight,
  isDragging,
  isTouched,
}: {
  slot: Slot | null;
  scrollX: number;
  timelineStart: Date;
  pixelsPerMinute: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  bodyHeight: number;
  isDragging: boolean;
  isTouched: boolean;
}) {
  if (!slot) return null;

  const start = slot.start;
  const end = slot.end;
  const duration = msBetween(start, end);

  const absoluteX = msToPx(msBetween(timelineStart, start), pixelsPerMinute);
  const viewportX = absoluteX - scrollX;
  const newY = slot.room.idx * rowHeight;
  const newLength = msToPx(duration, pixelsPerMinute);

  const startTime = clockTime(start);
  const endTime = clockTime(end);
  const durationText = durationFormatted(duration);

  const hasNew = true;
  const showEndElements = isDragging || isTouched;

  return (
    <>
      {/* Start ruler */}
      <span
        className="pointer-events-none absolute top-0 w-px bg-purple-600 dark:bg-purple-800"
        style={{
          left: sidebarWidth + viewportX,
          height: headerHeight + bodyHeight,
          visibility: hasNew ? "visible" : "hidden",
        }}
      />

      {/* End ruler */}
      <span
        className="pointer-events-none absolute top-0 w-px bg-purple-600 dark:bg-purple-800"
        style={{
          left: sidebarWidth + viewportX + newLength,
          height: headerHeight + bodyHeight,
          visibility: hasNew && showEndElements ? "visible" : "hidden",
        }}
      />

      {/* Timeboxes */}
      <div className="sticky top-0 h-0 overflow-visible" style={{ zIndex: 4 }}>
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: sidebarWidth + viewportX + newLength / 2,
            top: headerHeight,
            width: Math.max(50, newLength) + 50,
            transform: "translate(-50%, -100%)",
            visibility: hasNew ? "visible" : "hidden",
          }}
        >
          <span className="text-primary-content mr-auto flex h-5 w-[50px] items-center justify-center rounded-xs border border-purple-600 bg-purple-700 text-sm select-none dark:border-purple-700 dark:bg-purple-800">
            {startTime}
          </span>
          <span
            className="text-primary-content ml-auto flex h-5 w-[50px] items-center justify-center rounded-xs border border-purple-600 bg-purple-700 text-sm select-none dark:border-purple-700 dark:bg-purple-800"
            style={{ visibility: showEndElements ? "visible" : "hidden" }}
          >
            {endTime}
          </span>
        </div>
      </div>

      {/* New booking bar */}
      <div
        className="absolute px-0.5 py-1.5 whitespace-nowrap select-none"
        style={{
          left: sidebarWidth + viewportX,
          top: headerHeight + newY,
          width: newLength,
          height: rowHeight,
          visibility: hasNew ? "visible" : "hidden",
        }}
      >
        <div
          id={NEW_BOOKING_BOX_ID}
          className="bg-primary text-primary-content relative flex h-full w-full items-center justify-center rounded-sm border border-purple-600 dark:border-purple-700"
        >
          {isTouched && (
            <>
              {/* Left drag handle */}
              <span className="absolute top-1/2 left-0 h-4/5 w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600 dark:bg-purple-700" />
              {/* Right drag handle */}
              <span className="absolute top-1/2 right-0 h-4/5 w-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600 dark:bg-purple-700" />
            </>
          )}
          <span>{durationText}</span>
        </div>
      </div>
    </>
  );
}
