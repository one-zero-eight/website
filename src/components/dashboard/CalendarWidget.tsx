import { useDashboardCalendar } from "@/components/calendar/useDashboardCalendar.ts";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { Link } from "@tanstack/react-router";
import { ActivitySchedule } from "./ActivitySchedule.tsx";
import { getUpcomingActivities } from "./activities.ts";

export function CalendarWidget() {
  const nowMs = useNowMS(true);
  const { activities, isPending, refetch } = useDashboardCalendar(nowMs);
  const upcoming = getUpcomingActivities(activities, nowMs, 5);

  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="icon-[material-symbols--calendar-month-outline] text-primary size-8 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Calendar</h2>
          <p className="text-base-content/60 text-sm">
            {new Date(nowMs).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <ActivitySchedule
        activities={upcoming}
        nowMs={nowMs}
        isPending={isPending}
        onRetry={refetch}
      />
      <Link
        to="/calendar"
        className="text-primary mt-auto flex w-fit items-center gap-1 pt-1 text-sm font-medium hover:underline"
      >
        Go to calendar
        <span className="icon-[material-symbols--arrow-forward] text-lg" />
      </Link>
    </section>
  );
}
