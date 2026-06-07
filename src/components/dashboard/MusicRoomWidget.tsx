import { useMyMusicRoom } from "@/api/events/event-group.ts";
import { IcalExpander } from "@/components/calendar/iCalendarPlugin/ical-expander/IcalExpander.js";
import { useNowMS } from "@/lib/utils/use-now.ts";
import ICAL from "ical.js";
import { useEffect, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";

type MusicRoomBooking = {
  start: Date;
  end: Date;
};

export function MusicRoomWidget() {
  const [widgetShown, setWidgetShown] = useLocalStorage(
    "widget-music-room",
    false,
  );
  const { data: musicRoomSchedule, isPending } = useMyMusicRoom();
  const nowMs = useNowMS(!isPending, 30 * 1000);
  const bookings = useMemo(
    () => getUpcomingMusicRoomBookings(musicRoomSchedule, nowMs),
    [musicRoomSchedule, nowMs],
  );

  useEffect(() => {
    setWidgetShown((value) => (value && isPending) || !!musicRoomSchedule);
  }, [setWidgetShown, isPending, musicRoomSchedule]);

  if (isPending) {
    if (!widgetShown) return null;
    return (
      <div className="group skeleton flex min-h-32 flex-row gap-4 px-4 py-6" />
    );
  }

  return (
    <div className="group bg-base-200 rounded-box flex flex-row gap-4 px-4 py-4">
      <span className="icon-[material-symbols--piano] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <p className="text-base-content flex items-center text-lg font-semibold">
          <span className="icon-[material-symbols--piano] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
          <span>Music Room Bookings</span>
        </p>
        {bookings.length ? (
          bookings.map((booking) => (
            <span
              key={`${booking.start.toISOString()}-${booking.end.toISOString()}`}
              className="text-base-content/75"
            >
              {formatMusicRoomBooking(booking)}
            </span>
          ))
        ) : (
          <span className="text-base-content/75">
            You don't have any bookings now.
          </span>
        )}
        <a
          href="https://t.me/InnoMusicRoomBot"
          className="text-base-content/75 w-fit hover:underline"
        >
          Book more in <span className="text-primary">Music Room bot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}

function getUpcomingMusicRoomBookings(
  musicRoomSchedule: string | undefined,
  nowMs: number,
): MusicRoomBooking[] {
  if (!musicRoomSchedule) return [];

  try {
    const now = new Date(nowMs);
    const rangeEnd = new Date(now);
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    const expander = new IcalExpander({
      ics: musicRoomSchedule,
      skipInvalidDates: true,
    });
    const expandedBookings = expander.between(now, rangeEnd);
    const bookings = [
      ...expandedBookings.events.map((event: ICAL.Event) => ({
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
      })),
      ...expandedBookings.occurrences.map(
        (occurrence: { startDate: ICAL.Time; endDate: ICAL.Time }) => ({
          start: occurrence.startDate.toJSDate(),
          end: occurrence.endDate.toJSDate(),
        }),
      ),
    ];

    return bookings
      .filter((booking) => booking.end.getTime() >= nowMs)
      .sort((left, right) => left.start.getTime() - right.start.getTime());
  } catch {
    return [];
  }
}

function formatMusicRoomBooking({ start, end }: MusicRoomBooking) {
  const date = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = formatTime(start);
  const endTime = formatTime(end);

  return `${date}, ${startTime}-${endTime}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
