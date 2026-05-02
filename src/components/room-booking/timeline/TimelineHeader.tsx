import { msBetween } from "@/lib/utils/dates";
import { dayTitle, msToPx } from "./utils";

const HOURS_TIMES = Array.from({ length: 24 })
  .fill(null)
  .map((_, h) => `${h.toString().padStart(2, "0")}:00`);

export function TimelineHeader({
  visibleDates,
  timelineStart,
  scrollX,
  pixelsPerMinute,
  sidebarWidth,
  headerHeight,
}: {
  visibleDates: Date[];
  timelineStart: Date;
  scrollX: number;
  pixelsPerMinute: number;
  sidebarWidth: number;
  headerHeight: number;
}) {
  const hourWidth = pixelsPerMinute * 60;

  return (
    <div
      className="bg-base-100 border-base-300 text-base-content/50 sticky top-0 block overflow-hidden border-b"
      style={{
        zIndex: 2,
        marginLeft: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        height: headerHeight,
      }}
    >
      {visibleDates.map((day) => {
        const dayOffset =
          msToPx(msBetween(timelineStart, day), pixelsPerMinute) - scrollX;

        return (
          <div
            key={day.toISOString()}
            className="absolute top-0 flex h-full flex-col justify-between"
            style={{
              left: dayOffset,
              width: hourWidth * 24,
            }}
          >
            <span className="text-md sticky left-0 self-start pt-1.5 pl-3">
              {dayTitle(day)}
            </span>
            <div className="flex items-center">
              {HOURS_TIMES.map((hour) => (
                <span key={hour} style={{ width: hourWidth }}>
                  <span
                    className="text-base-content/50 flex h-5 w-[50px] items-center justify-center text-sm select-none"
                    style={{ transform: "translate(-50%, 1px)" }}
                  >
                    {hour}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
