import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { slotKeyToBackend } from "./utils/api-slots.ts";
import { formatMeetingDates, getSlotKey, parseSlotKey } from "./utils/slots.ts";
import type { MeetingUser } from "./types.ts";

function slotKeyToDateRange(slotKey: string) {
  const backendSlot = slotKeyToBackend(slotKey);
  const start = new Date(backendSlot);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return { start, end, scrollTimestamp: start.getTime() };
}

function bookingsOverlap(
  bookingStart: string,
  bookingEnd: string,
  slotStart: Date,
  slotEnd: Date,
) {
  const start = new Date(bookingStart).getTime();
  const end = new Date(bookingEnd).getTime();

  return start < slotEnd.getTime() && end > slotStart.getTime();
}

function getTopSlots({
  users,
  dates,
  timeSlots,
  allowedSlots,
  limit = 8,
}: {
  users: MeetingUser[];
  dates: ReturnType<typeof formatMeetingDates>;
  timeSlots: string[];
  allowedSlots: Set<string>;
  limit?: number;
}) {
  const slots: { slotKey: string; count: number; label: string }[] = [];

  for (const date of dates) {
    for (const time of timeSlots) {
      const slotKey = getSlotKey(date.id, time);

      if (!allowedSlots.has(slotKey)) {
        continue;
      }

      const count = users.filter((user) => user.slots.has(slotKey)).length;

      if (count === 0) {
        continue;
      }

      slots.push({
        slotKey,
        count,
        label: `${date.monthDay}, ${time}`,
      });
    }
  }

  return slots.sort((a, b) => b.count - a.count).slice(0, limit);
}

function RoomListForSlot({
  slotKey,
  open,
}: {
  slotKey: string;
  open: boolean;
}) {
  const { me } = useMe();
  const slotRange = useMemo(() => slotKeyToDateRange(slotKey), [slotKey]);

  const { data: myAccessList } = $roomBooking.useQuery(
    "get",
    "/rooms/my-access-list",
    {},
    { enabled: open },
  );

  const {
    data: rooms,
    isPending: isRoomsPending,
    isError: isRoomsError,
    error: roomsError,
  } = $roomBooking.useQuery(
    "get",
    "/rooms/",
    { params: { query: { include_red: true } } },
    { enabled: open },
  );

  const bookableRooms = useMemo(() => {
    const myAccessListRoomIds = myAccessList?.map((room) => room.id) ?? [];

    return (
      rooms?.filter(
        (room) =>
          room.access_level === RoomAccess_levelAnyOf0.yellow ||
          (room.access_level === RoomAccess_levelAnyOf0.red &&
            me?.innopolis_info?.is_staff) ||
          myAccessListRoomIds.includes(room.id),
      ) ?? []
    );
  }, [rooms, me?.innopolis_info?.is_staff, myAccessList]);

  const {
    data: bookings,
    isPending: isBookingsPending,
    isError: isBookingsError,
    error: bookingsError,
  } = $roomBooking.useQuery(
    "get",
    "/bookings/",
    {
      params: {
        query: {
          start: slotRange.start.toISOString(),
          end: slotRange.end.toISOString(),
          room_ids: bookableRooms.map((room) => room.id),
        },
      },
    },
    {
      enabled: open && bookableRooms.length > 0,
    },
  );

  const availableRooms = useMemo(() => {
    if (!bookings) {
      return [];
    }

    const busyRoomIds = new Set<string>();

    for (const booking of bookings) {
      if (
        bookingsOverlap(
          booking.start,
          booking.end,
          slotRange.start,
          slotRange.end,
        )
      ) {
        busyRoomIds.add(booking.room_id);
      }
    }

    return bookableRooms.filter((room) => !busyRoomIds.has(room.id));
  }, [bookings, bookableRooms, slotRange]);

  const isPending = isRoomsPending || isBookingsPending;
  const isError = isRoomsError || isBookingsError;
  const error = roomsError ?? bookingsError;

  if (isPending) {
    return (
      <div className="grid gap-2 py-2">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error">
        <span>{formatApiErrorMessage(error)}</span>
      </div>
    );
  }

  if (availableRooms.length === 0) {
    return (
      <p className="text-base-content/50 py-2 text-sm">
        No free rooms for this timeslot.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {availableRooms.map((room) => (
        <Link
          key={room.id}
          to="/room-booking/"
          search={{ d: slotRange.scrollTimestamp }}
          className="border-base-300 hover:border-primary/30 flex items-center justify-between rounded-lg border p-3 text-sm"
        >
          <div>
            <div className="font-medium">{room.title}</div>
            {room.capacity && (
              <div className="text-base-content/60">
                Up to {room.capacity} people
              </div>
            )}
          </div>
          <span className="text-primary text-sm font-medium">Book</span>
        </Link>
      ))}
    </div>
  );
}

export function BookRoomPage({
  meetingId,
  meetingName,
  users,
  dates,
  timeSlots,
  allowedSlots,
  selectedSlotKey,
}: {
  meetingId: string;
  meetingName: string;
  users: MeetingUser[];
  dates: ReturnType<typeof formatMeetingDates>;
  timeSlots: string[];
  allowedSlots: Set<string>;
  selectedSlotKey?: string;
}) {
  const topSlots = useMemo(
    () => getTopSlots({ users, dates, timeSlots, allowedSlots }),
    [users, dates, timeSlots, allowedSlots],
  );

  const activeSlotKey =
    selectedSlotKey && allowedSlots.has(selectedSlotKey)
      ? selectedSlotKey
      : topSlots[0]?.slotKey;

  const activeLabel = activeSlotKey
    ? (() => {
        const { dateId, time } = parseSlotKey(activeSlotKey);
        const date = dates.find((entry) => entry.id === dateId);
        return `${date?.monthDay ?? dateId}, ${time}`;
      })()
    : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <Link
        to="/when2meet/$meetingId"
        params={{ meetingId }}
        search={{ name: meetingName }}
        className="text-base-content/70 hover:text-base-content mb-4 inline-flex items-center gap-1 text-sm"
      >
        <span className="icon-[material-symbols--arrow-back]" />
        Back to meeting
      </Link>

      <h1 className="mb-1 text-xl font-semibold">Book a room</h1>
      <p className="text-base-content/70 mb-6 text-sm">
        For <span className="font-medium">{meetingName}</span>
      </p>

      {topSlots.length === 0 ? (
        <div className="bg-base-100 border-base-300 rounded-box border p-4 text-sm">
          <p className="text-base-content/60">
            No overlapping availability yet. Ask participants to mark their
            times first.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="bg-base-100 border-base-300 rounded-box border p-4">
            <h2 className="mb-3 text-sm font-medium">Popular timeslots</h2>
            <div className="grid gap-2">
              {topSlots.map((slot) => (
                <Link
                  key={slot.slotKey}
                  to="/when2meet/$meetingId/book-room"
                  params={{ meetingId }}
                  search={{ name: meetingName, slot: slot.slotKey }}
                  className={
                    slot.slotKey === activeSlotKey
                      ? "border-primary bg-primary/5 flex items-center justify-between rounded-lg border p-3 text-sm"
                      : "border-base-300 hover:border-primary/30 flex items-center justify-between rounded-lg border p-3 text-sm"
                  }
                >
                  <span>{slot.label}</span>
                  <span className="text-base-content/60">
                    {slot.count} available
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {activeSlotKey && activeLabel && (
            <section className="bg-base-100 border-base-300 rounded-box border p-4">
              <h2 className="mb-3 text-sm font-medium">
                Free rooms for {activeLabel}
              </h2>
              <RoomListForSlot slotKey={activeSlotKey} open={true} />
              <Link
                to="/room-booking/"
                search={{
                  d: slotKeyToDateRange(activeSlotKey).scrollTimestamp,
                }}
                className="btn btn-outline mt-3 w-full"
              >
                Open room booking timeline
              </Link>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
