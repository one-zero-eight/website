import { sanitizeBookingTitle } from "@/components/room-booking/utils.ts";
import { cn } from "@/lib/ui/cn";
import { useNowMS } from "@/lib/utils/use-now.ts";
import { Link } from "@tanstack/react-router";
import { formatActivityTime, formatScheduleDayHeader } from "./activities.ts";
import { useBookingRecommendations } from "./useBookingRecommendations.ts";

function formatFreeDuration(milliseconds: number) {
  const days = Math.floor(milliseconds / 86_400_000);
  const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  return (
    [
      days ? `${days}d` : "",
      hours ? `${hours}h` : "",
      minutes ? `${minutes}min` : "",
    ]
      .filter(Boolean)
      .join(" ") || "<1min"
  );
}

export function BookingsWidget() {
  const nowMs = useNowMS(true);
  const { entries, isPending, isError, isFetching, refetch } =
    useBookingRecommendations(nowMs);

  const myBookings = entries.filter((entry) => entry.kind === "booked");
  const possibleBookings = entries.filter(
    (entry) => entry.kind === "available",
  );

  const bookingGroups = new Map<string, typeof myBookings>();
  for (const entry of myBookings) {
    const startDate = new Date(entry.booking.start);
    const day = startDate.toDateString();
    const group = bookingGroups.get(day) ?? [];
    group.push(entry);
    bookingGroups.set(day, group);
  }

  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="icon-[material-symbols--meeting-room-outline] text-primary size-8 shrink-0" />
        <h2 className="text-lg font-semibold">Room booking</h2>
      </div>
      {isError && (
        <div className="bg-error/10 text-error rounded-field flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <span>Some bookings or room availability could not be verified.</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Retry"
            )}
          </button>
        </div>
      )}
      {entries.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3">
          {[...bookingGroups].map(([day, group], groupIndex) => (
            <div
              key={day}
              className={cn(
                "flex min-w-0 flex-col gap-2",
                groupIndex > 0 && "pt-1",
              )}
            >
              <p className="text-base-content/60 border-base-content/20 border-b pb-2 text-sm">
                {formatScheduleDayHeader(
                  new Date(group[0].booking.start),
                  nowMs,
                )}
              </p>
              <ul className="flex min-w-0 flex-col gap-3">
                {group.map((entry) => {
                  const startMs = Date.parse(entry.booking.start);
                  const endMs = Date.parse(entry.booking.end);
                  const inProgress = startMs <= nowMs && endMs > nowMs;
                  const activity = {
                    id: entry.booking.id,
                    title: entry.booking.title,
                    start: new Date(entry.booking.start),
                    end: new Date(entry.booking.end),
                  };

                  return (
                    <li key={entry.booking.id}>
                      <Link
                        to="/room-booking/rooms/$room"
                        params={{ room: entry.roomId }}
                        className={cn(
                          "group flex min-w-0 flex-col gap-0.5 border-l-2 pl-3",
                          inProgress ? "border-error" : "border-primary",
                        )}
                      >
                        <span
                          className={cn(
                            "text-base font-semibold tabular-nums",
                            inProgress && "text-error",
                          )}
                        >
                          {formatActivityTime(activity)}
                        </span>
                        <span className="text-base-content/60 min-w-0 text-sm wrap-anywhere group-hover:underline">
                          {entry.roomTitle}
                        </span>
                        {entry.booking.title && (
                          <span className="text-base-content/60 min-w-0 text-sm wrap-anywhere">
                            {sanitizeBookingTitle(entry.booking.title)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {possibleBookings.length > 0 && (
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-base-content/60 border-base-content/20 border-b pb-2 text-sm">
                Available rooms
              </p>
              <ul className="flex min-w-0 flex-col gap-3">
                {possibleBookings.map((entry) => (
                  <li key={entry.roomId}>
                    <Link
                      to="/room-booking/rooms/$room"
                      params={{ room: entry.roomId }}
                      className="group border-primary flex min-w-0 flex-col gap-0.5 border-l-2 pl-3"
                    >
                      <span className="min-w-0 text-base font-semibold wrap-anywhere group-hover:underline">
                        {entry.roomTitle}
                      </span>
                      <span className="text-base-content/60 min-w-0 text-sm tabular-nums">
                        Free for {entry.nextBookingKnown ? "" : "at least "}
                        {formatFreeDuration(entry.availableUntilMs - nowMs)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {isPending && (
        <div className="flex flex-col gap-3">
          {Array.from(
            { length: Math.min(3, 5 - entries.length) },
            (_, index) => (
              <div key={index} className="flex flex-col gap-2 py-1">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ),
          )}
        </div>
      )}
      <Link
        to="/room-booking"
        className="text-primary mt-auto flex w-fit items-center gap-1 pt-1 text-sm font-medium hover:underline"
      >
        Go to room booking
        <span className="icon-[material-symbols--arrow-forward] text-lg" />
      </Link>
    </section>
  );
}
