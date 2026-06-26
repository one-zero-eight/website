import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { slotKeyToDateRange } from "./utils/api-slots.ts";
import { parseSlotKey } from "./utils/slots.ts";

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
  const queryClient = useQueryClient();
  const { me } = useMe();
  const { showSuccess, showError } = useToast();
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

  const { mutate: createBooking, isPending: isBookingRoom } =
    $roomBooking.useMutation("post", "/bookings/", {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $roomBooking.queryOptions("get", "/bookings/").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
        });
        showSuccess(
          "Room booked",
          "Booking was created and will appear in your calendar.",
        );
        onOpenChange(false);
      },
      onError: (bookingError) => {
        showError("Error", formatApiErrorMessage(bookingError));
      },
    });

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

  function handleBookRoom(roomId: string) {
    if (!slotRange) {
      return;
    }

    createBooking({
      body: {
        room_id: roomId,
        title: meetingName,
        start: slotRange.start.toISOString(),
        end: slotRange.end.toISOString(),
        participant_emails: null,
      },
    });
  }

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
                <button
                  key={room.id}
                  type="button"
                  className="border-base-300 bg-base-100 hover:border-primary/30 rounded-box flex items-center justify-between border p-3 transition"
                  disabled={isBookingRoom}
                  onClick={() => handleBookRoom(room.id)}
                >
                  <div className="text-left">
                    <div className="font-semibold">{room.title}</div>
                    {room.capacity && (
                      <div className="text-base-content/60 text-sm">
                        Up to {room.capacity} people
                      </div>
                    )}
                  </div>
                  {isBookingRoom ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <span className="badge badge-primary badge-outline">
                      Book
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <Link
            to="/room-booking"
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
