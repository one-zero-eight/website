import { clockTime, msBetween } from "@/lib/utils/dates";
import { msToPx } from "./utils";

export function NowIndicator({
  now,
  timelineStart,
  scrollX,
  pixelsPerMinute,
  sidebarWidth,
  headerHeight,
  bodyHeight,
  onScrollToNow,
}: {
  now: Date;
  timelineStart: Date;
  scrollX: number;
  pixelsPerMinute: number;
  sidebarWidth: number;
  headerHeight: number;
  bodyHeight: number;
  onScrollToNow: () => void;
}) {
  const nowX = msToPx(msBetween(timelineStart, now), pixelsPerMinute) - scrollX;

  return (
    <>
      {/* Now ruler - red vertical line */}
      <span
        className="pointer-events-none absolute top-0 w-px bg-red-600 dark:bg-red-800"
        style={{
          left: sidebarWidth + nowX,
          height: headerHeight + bodyHeight,
        }}
      />

      {/* Now timebox - sticky red badge */}
      <div
        className="sticky top-0 flex h-0 items-end overflow-visible"
        style={{ zIndex: 4 }}
      >
        {/* Spacer before */}
        <div
          className="shrink-0"
          style={{ flexBasis: Math.max(0, nowX + sidebarWidth - 25) }}
        />
        <span
          className="sticky right-0 flex h-5 w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-xs border border-red-600 bg-red-400 text-sm text-red-900 select-none dark:border-red-800 dark:bg-red-900 dark:text-red-500"
          style={{
            left: sidebarWidth,
            transform: `translateY(${headerHeight}px)`,
          }}
          onClick={onScrollToNow}
        >
          {clockTime(now)}
        </span>
        {/* Spacer after */}
        <div className="grow" />
      </div>
    </>
  );
}
