import { cn } from "@/lib/ui/cn";
import { PomodoroMode } from "../lib/usePomodoro";

type SegmentStatus = "done" | "current" | "upcoming";

const SEGMENT_STATUS_CLASSES: Record<SegmentStatus, string> = {
  done: "bg-primary border-primary",
  current: "border-primary",
  upcoming: "border-base-content/30",
};

// Focus sessions are pills, short breaks between them are dots.
export function PomodoroCycleDots({
  mode,
  completedSessions,
  totalSessions,
}: {
  mode: PomodoroMode;
  completedSessions: number;
  totalSessions: number;
}) {
  const getSessionStatus = (index: number): SegmentStatus => {
    if (index < completedSessions) return "done";
    if (index === completedSessions && mode === "work") return "current";
    return "upcoming";
  };

  const getBreakStatus = (index: number): SegmentStatus => {
    if (completedSessions <= index) return "upcoming";
    const isCurrentBreak =
      completedSessions === index + 1 && mode === "shortBreak";
    return isCurrentBreak ? "current" : "done";
  };

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSessions }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className={cn(
              "h-4 w-10 rounded-full border-2",
              SEGMENT_STATUS_CLASSES[getSessionStatus(index)],
            )}
          />
          {index < totalSessions - 1 && (
            <span
              className={cn(
                "size-4 rounded-full border-2",
                SEGMENT_STATUS_CLASSES[getBreakStatus(index)],
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
