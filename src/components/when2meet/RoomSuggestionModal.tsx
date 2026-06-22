import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { slotKeyToBackend } from "./utils/api-slots.ts";
import { parseSlotKey } from "./utils/slots.ts";

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

export function RoomSuggestionModal({
  open,
  onOpenChange,
  slotKey,
  meetingName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: string | null;
  meetingName: string;
}) {
  const { me } = useMe();
  const slotRange = useMemo(
    () => (slotKey ? slotKeyToDateRange(slotKey) : null),
    [slotKey],
  );
  const { dateId, time } = slotKey
    ? parseSlotKey(slotKey)
    : { dateId: "", time: "" };

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
          start: slotRange?.start.toISOString() ?? new Date().toISOString(),
          end: slotRange?.end.toISOString() ?? new Date().toISOString(),
          room_ids: bookableRooms.map((room) => room.id),
        },
      },
    },
    {
      enabled: open && !!slotRange && bookableRooms.length > 0,
    },
  );

  const availableRooms = useMemo(() => {
    if (!slotRange || !bookings) {
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

  const slotLabel = slotKey ? `${dateId}, ${time}` : "No time selected";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Book a room"
      containerClassName="max-w-md"
    >
      <div className="text-base-content/70 text-sm">
        Best time for <span className="font-medium">{meetingName}</span>:{" "}
        {slotLabel}
      </div>

      {isPending && (
        <div className="grid gap-2 py-2">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      )}

      {isError && (
        <div className="alert alert-error mt-2">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
      )}

      {!isPending && !isError && (
        <>
          {availableRooms.length === 0 ? (
            <div className="text-base-content/50 py-6 text-center text-sm">
              No free rooms for this timeslot.
            </div>
          ) : (
            <div className="grid gap-2">
              {availableRooms.map((room) => (
                <Link
                  key={room.id}
                  to="/room-booking/"
                  search={{ d: slotRange?.scrollTimestamp }}
                  className="border-base-300 bg-base-100 hover:border-primary/30 rounded-box flex items-center justify-between border p-3 transition"
                  onClick={() => onOpenChange(false)}
                >
                  <div>
                    <div className="font-semibold">{room.title}</div>
                    {room.capacity && (
                      <div className="text-base-content/60 text-sm">
                        Up to {room.capacity} people
                      </div>
                    )}
                  </div>
                  <span className="badge badge-primary badge-outline">
                    Book
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            to="/room-booking/"
            search={{ d: slotRange?.scrollTimestamp }}
            className="btn btn-outline mt-3 w-full"
            onClick={() => onOpenChange(false)}
          >
            Open room booking timeline
          </Link>
        </>
      )}
    </Modal>
  );
}
