import { $roomBooking } from "@/api/room-booking";
import { type roomBookingTypes } from "@/api/room-booking";
import { T } from "@/lib/utils/dates";
import { Helmet } from "@dr.pogodin/react-helmet";
import { EventInput } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import moment from "moment/moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizeBookingTitle } from "../utils.ts";
import { TvCalendar } from "./TvCalendar.tsx";
import { TvRoomQr } from "./TvRoomQr.tsx";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * T.Day);
  return { start, end };
}

function getNowScrollTime() {
  const now = new Date();
  const hourNumber = now.getHours() - 8;
  if (hourNumber < 0) {
    return "00:00:00";
  }

  const hour = hourNumber.toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}:00`;
}

function findCurrentBooking(
  bookings: roomBookingTypes.SchemaBooking[] | undefined,
  now: Date,
) {
  if (!bookings) return undefined;
  return bookings.find((booking) => {
    const start = new Date(booking.start).getTime();
    const end = new Date(booking.end).getTime();
    const nowTs = now.getTime();
    return start <= nowTs && nowTs < end;
  });
}

export function RoomTvPage({ id }: { id: string }) {
  const calendarRef = useRef<FullCalendar>(null);
  const [now, setNow] = useState(() => new Date());
  const { start, end } = useMemo(() => getTodayRange(), [now]);

  const {
    data: bookings,
    isPending: isBookingsPending,
    isError: isBookingsError,
  } = $roomBooking.useQuery(
    "get",
    "/room/{id}/bookings",
    {
      params: {
        path: { id },
        query: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    },
    {
      refetchInterval: T.Min,
      retry: 5,
      retryDelay: 2 * T.Sec,
    },
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
      calendarRef.current?.getApi().scrollToTime(getNowScrollTime());
    }, 10 * T.Sec);
    return () => window.clearInterval(interval);
  }, []);

  const events = useMemo<EventInput[]>(
    () =>
      (bookings ?? []).map((booking) => ({
        id: booking.id,
        title: sanitizeBookingTitle(booking.title),
        start: booking.start,
        end: booking.end,
        color: booking.related_to_me ? "seagreen" : "#9A2EFF",
      })),
    [bookings],
  );
  const currentBooking = useMemo(
    () => findCurrentBooking(bookings, now),
    [bookings, now],
  );
  const nextBooking = useMemo(() => {
    if (!bookings) return undefined;
    return bookings
      .filter((booking) => new Date(booking.start).getTime() > now.getTime())
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )[0];
  }, [bookings, now]);
  const { data: fullBookingDetails } = $roomBooking.useQuery(
    "get",
    "/bookings/by-entry-id/{outlook_entry_id}",
    {
      params: {
        path: { outlook_entry_id: currentBooking?.outlook_entry_id ?? "" },
        query: { room_id: currentBooking?.room_id ?? "" },
      },
    },
    {
      enabled: !!currentBooking?.outlook_entry_id,
    },
  );
  const attendees = fullBookingDetails?.attendees ?? currentBooking?.attendees;
  const organizerEmail = useMemo(
    () =>
      attendees?.find(
        (attendee) => attendee.assosiated_room_id === null && attendee.email,
      )?.email ?? null,
    [attendees],
  );
  const organizerBookingId = currentBooking?.outlook_booking_id ?? null;
  const { data: organizerDetails } = $roomBooking.useQuery(
    "get",
    "/bookings/{outlook_booking_id}/get-attendee-details",
    {
      params: {
        path: { outlook_booking_id: organizerBookingId ?? "" },
        query: { user_email: organizerEmail ?? "" },
      },
    },
    {
      enabled: !!organizerBookingId && !!organizerEmail,
      refetchInterval: T.Min,
    },
  );

  const isLoading = isBookingsPending;
  const isError = isBookingsError;

  return (
    <>
      <Helmet>
        <title>Room TV</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        data-theme="light"
        className="bg-base-100 text-base-content flex h-dvh w-full overflow-hidden"
      >
        <div className="min-w-0 grow">
          <TvCalendar
            events={events}
            start={start}
            end={end}
            isLoading={isLoading}
            isError={isError}
            scrollTime={getNowScrollTime()}
            calendarRef={calendarRef}
          />
        </div>

        <aside className="border-base-300 bg-base-200 flex w-[420px] shrink-0 flex-col border-l p-6 text-[1.8rem] leading-tight font-semibold text-black">
          {isLoading ? (
            <div className="flex h-full flex-col">
              <div className="skeleton h-10 w-2/3 rounded-md" />
              <div className="skeleton mt-2 h-5 w-1/2 rounded-md" />
              <div className="mt-8 space-y-3">
                <div className="skeleton h-8 w-1/2 rounded-md" />
                <div className="skeleton h-7 w-full rounded-md" />
                <div className="skeleton h-6 w-1/3 rounded-md" />
              </div>
              <div className="mt-auto space-y-3">
                <div className="skeleton h-7 w-1/2 rounded-md" />
                <div className="skeleton h-40 w-40 rounded-md" />
              </div>
            </div>
          ) : (
            <>
              <h1>{id}</h1>
              <p className="mt-2 text-red-500">
                {moment(now).format("dddd, D MMMM HH:mm")}
              </p>
              <div className="divider my-6" />
              <div>
                {currentBooking ? (
                  <div className="mt-2">
                    <p className="text-sm uppercase">Title</p>
                    <p className="mt-1 line-clamp-3 break-all">
                      {sanitizeBookingTitle(currentBooking.title)}
                    </p>
                    <p className="mt-3 text-sm uppercase">Time</p>
                    <p className="text-primary mt-1">
                      {moment(currentBooking.start).format("HH:mm")} -{" "}
                      {moment(currentBooking.end).format("HH:mm")}
                    </p>

                    {(organizerDetails || organizerEmail) && (
                      <div className="mt-5 space-y-3">
                        <div>
                          <p className="text-sm uppercase">Organizer</p>
                          <p>{organizerDetails?.name ?? null}</p>
                          <p className="text-base break-all">
                            {organizerDetails?.email ?? organizerEmail ?? null}
                          </p>
                        </div>
                      </div>
                    )}
                    {nextBooking && (
                      <div className="mt-5">
                        <div className="divider my-2" />
                        <p className="text-base">
                          Next meeting at{" "}
                          <span className="text-primary">
                            {moment(nextBooking.start).format("HH:mm")} -{" "}
                            {moment(nextBooking.end).format("HH:mm")}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    <p>No active booking now.</p>
                    {nextBooking && (
                      <div>
                        <div className="divider my-2" />
                        <p className="text-base">
                          Next meeting at{" "}
                          <span className="text-primary">
                            {moment(nextBooking.start).format("HH:mm")} -{" "}
                            {moment(nextBooking.end).format("HH:mm")}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <TvRoomQr id={id} />
            </>
          )}
        </aside>
      </div>
    </>
  );
}
