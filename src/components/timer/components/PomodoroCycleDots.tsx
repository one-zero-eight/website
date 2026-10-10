import { cn } from "@/lib/ui/cn";

export function PomodoroCycleDots({
  completedSessions,
  totalSessions,
}: {
  completedSessions: number;
  totalSessions: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSessions }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-4 rounded-full border-2",
            i < completedSessions
              ? "bg-primary border-primary"
              : "border-base-content/30",
          )}
        />
      ))}
    </div>
  );
}
