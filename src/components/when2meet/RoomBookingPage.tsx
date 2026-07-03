import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import type { roomBookingTypes } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RoomBookingConfirmModal } from "./RoomBookingConfirmModal.tsx";
import { BookingTimePicker } from "./BookingTimePicker.tsx";
import { useWhen2MeetRoomBookings } from "./useWhen2MeetRoomBookings.ts";
import { parseBackendSlots, slotKeyToDateRange } from "./utils/api-slots.ts";
import { getMeetingBookingIntersection } from "./utils/best-slot.ts";
import {
  saveMeetingRoomBooking,
  type MeetingRoomBooking,
} from "./utils/meeting-room-booking.ts";
import {
  participantsToUsers,
  sortUsersWithCurrentUserFirst,
} from "./utils/participants.ts";
import {
  formatReservationRange,
  getAvailableRoomsForSlotKeys,
  getSlotKeysRange,
} from "./utils/room-booking-utils.ts";
import { formatMeetingDates, formatSlotKeyLabel } from "./utils/slots.ts";

export function RoomBookingPage({ meetingId }: { meetingId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me } = useMe();
  const { showSuccess, showError } = useToast();
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [bookingSlotKey, setBookingSlotKey] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [confirmRoom, setConfirmRoom] =
    useState<roomBookingTypes.SchemaRoom | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    data: event,
    isPending: isEventPending,
    isError: isEventError,
    error: eventError,
  } = $when2meet.useQuery("get", "/events/{event_ref}", {
    params: { path: { event_ref: meetingId } },
  });

  const isOwner = !!me?.id && event?.owner_id === me.id;
  const meetingSlug = event?.slug ?? meetingId;
  const meetingName = event?.name ?? "Meeting";

  useEffect(() => {
    if (isEventPending || !event || isOwner) {
      return;
    }

    showError("Error", "Only the meeting owner can book a room.");
    navigate({
      to: "/when2meet/$meetingId",
      params: { meetingId: meetingSlug },
    });
  }, [isEventPending, event, isOwner, navigate, meetingSlug, showError]);

  const parsedSlots = useMemo(
    () => (event ? parseBackendSlots(event.slots) : null),
    [event],
  );

  const formattedDates = useMemo(
    () => formatMeetingDates(parsedSlots?.dates ?? []),
    [parsedSlots],
  );

  const allowedSlots = useMemo(
    () => new Set(parsedSlots?.slotKeys ?? []),
    [parsedSlots],
  );

  const users = useMemo(
    () =>
      event
        ? sortUsersWithCurrentUserFirst(
            participantsToUsers(event.participants),
            me?.id,
          )
        : [],
    [event, me?.id],
  );

  const bookingIntersection = useMemo(() => {
    if (!parsedSlots) {
      return { slotKeys: [] as string[], maxCount: 0 };
    }

    return getMeetingBookingIntersection(
      users,
      parsedSlots.dates,
      parsedSlots.timeSlots,
      allowedSlots,
    );
  }, [parsedSlots, users, allowedSlots]);

  const intersectionSlotKeys = bookingIntersection.slotKeys;
  const intersectionCount = bookingIntersection.maxCount;
  const hasIntersections = intersectionSlotKeys.length > 0;
  const hasMultipleIntersections = intersectionSlotKeys.length > 1;

  useEffect(() => {
    if (intersectionSlotKeys.length === 1) {
      const onlySlotKey = intersectionSlotKeys[0] ?? null;

      if (!onlySlotKey) {
        return;
      }

      setSelectedSlotKeys(new Set([onlySlotKey]));
      setBookingSlotKey(onlySlotKey);
      return;
    }

    setSelectedSlotKeys(new Set());
    setBookingSlotKey(null);
  }, [intersectionSlotKeys]);

  const selectedSlotKeysKey = useMemo(
    () => [...selectedSlotKeys].sort().join(","),
    [selectedSlotKeys],
  );

  useEffect(() => {
    setSelectedRoomId(null);
    setConfirmRoom(null);
    setConfirmOpen(false);
  }, [selectedSlotKeysKey]);

  function handleToggleSlotKey(slotKey: string) {
    const wasSelected = selectedSlotKeys.has(slotKey);
    const nextSlotKeys = new Set(selectedSlotKeys);

    if (wasSelected) {
      nextSlotKeys.delete(slotKey);
    } else {
      nextSlotKeys.add(slotKey);
    }

    setSelectedSlotKeys(nextSlotKeys);

    if (!wasSelected) {
      setBookingSlotKey(slotKey);
      return;
    }

    if (bookingSlotKey === slotKey) {
      const remainingSlotKeys = [...nextSlotKeys];
      setBookingSlotKey(
        remainingSlotKeys[remainingSlotKeys.length - 1] ?? null,
      );
    }
  }

  const intersectionRange = useMemo(
    () => getSlotKeysRange(intersectionSlotKeys),
    [intersectionSlotKeys],
  );

  const bookingSlotRange = useMemo(
    () => (bookingSlotKey ? slotKeyToDateRange(bookingSlotKey) : null),
    [bookingSlotKey],
  );

  const { data: myAccessList } = $roomBooking.useQuery(
    "get",
    "/rooms/my-access-list",
    {},
    { enabled: hasIntersections && isOwner },
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
    { enabled: hasIntersections && isOwner },
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
    bookings,
    isPending: isBookingsPending,
    isError: isBookingsError,
    error: bookingsError,
  } = useWhen2MeetRoomBookings({
    bookableRooms,
    start: intersectionRange?.start.toISOString(),
    end: intersectionRange?.end.toISOString(),
    enabled:
      !!intersectionRange &&
      bookableRooms.length > 0 &&
      hasIntersections &&
      isOwner,
  });

  const { mutate: createBooking, isPending: isBookingRoom } =
    $roomBooking.useMutation("post", "/bookings/", {
      onSuccess: (_booking, variables) => {
        queryClient.invalidateQueries({
          queryKey: $roomBooking.queryOptions("get", "/bookings/").queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
        });

        if (!bookingSlotKey || !confirmRoom) {
          return;
        }

        const savedBooking: MeetingRoomBooking = {
          slotKey: bookingSlotKey,
          roomId: variables.body.room_id,
          roomTitle: confirmRoom.title,
          start: variables.body.start,
          end: variables.body.end,
        };

        saveMeetingRoomBooking(meetingSlug, savedBooking);
        showSuccess(
          "Room booked",
          `${confirmRoom.title} · ${formatSlotKeyLabel(bookingSlotKey, formattedDates)}`,
        );
        setConfirmOpen(false);
        navigate({
          to: "/when2meet/$meetingId",
          params: { meetingId: meetingSlug },
        });
      },
      onError: (bookingError) => {
        showError("Error", formatApiErrorMessage(bookingError));
      },
    });

  const availableRooms = useMemo(() => {
    if (!bookings || selectedSlotKeys.size === 0) {
      return [];
    }

    return getAvailableRoomsForSlotKeys(
      [...selectedSlotKeys],
      bookings,
      bookableRooms,
    );
  }, [bookings, bookableRooms, selectedSlotKeys]);

  const sortedAvailableRooms = useMemo(
    () =>
      [...availableRooms].sort((leftRoom, rightRoom) =>
        leftRoom.title.localeCompare(rightRoom.title, undefined, {
          numeric: true,
        }),
      ),
    [availableRooms],
  );

  const selectedRoom = useMemo(
    () =>
      sortedAvailableRooms.find((room) => room.id === selectedRoomId) ?? null,
    [sortedAvailableRooms, selectedRoomId],
  );

  const isAvailabilityPending =
    selectedSlotKeys.size > 0 && (isBookingsPending || isRoomsPending);
  const isAvailabilityError = isBookingsError;
  const availabilityError = bookingsError;
  const canPickRoom =
    selectedSlotKeys.size > 0 &&
    !!bookingSlotKey &&
    !isAvailabilityPending &&
    !isAvailabilityError;
  const hasFreeRooms = sortedAvailableRooms.length > 0;

  const bookingSlotLabel = bookingSlotKey
    ? formatSlotKeyLabel(bookingSlotKey, formattedDates)
    : null;

  const roomSelectPlaceholder =
    selectedSlotKeys.size === 0
      ? "Choose a time first"
      : !bookingSlotKey
        ? "Pick at least one time"
        : isAvailabilityPending
          ? "Loading availability..."
          : isAvailabilityError
            ? "Could not load availability"
            : !hasFreeRooms
              ? "No rooms free for all selected times"
              : "Choose a room";

  function handleBookClick() {
    if (!selectedRoom) {
      return;
    }

    setConfirmRoom(selectedRoom);
    setConfirmOpen(true);
  }

  function handleConfirmBooking() {
    if (!bookingSlotRange || !bookingSlotKey || !confirmRoom) {
      return;
    }

    createBooking({
      body: {
        room_id: confirmRoom.id,
        title: meetingName,
        start: bookingSlotRange.start.toISOString(),
        end: bookingSlotRange.end.toISOString(),
        participant_emails: null,
      },
    });
  }

  if (isEventPending) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-6 h-40 w-full" />
      </div>
    );
  }

  if (isEventError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(eventError)}</span>
        </div>
      </div>
    );
  }

  if (!event || !isOwner) {
    return null;
  }

  return (
    <>
      <div className="mx-auto mb-20 w-full max-w-lg px-4 py-4 md:mb-4">
        <Link
          to="/when2meet/$meetingId"
          params={{ meetingId: meetingSlug }}
          className="text-base-content/70 hover:text-base-content inline-flex w-fit items-center gap-1 text-sm font-medium"
        >
          <span className="icon-[material-symbols--arrow-back] text-lg" />
          Back to meeting
        </Link>

        <h1 className="mt-4 text-2xl font-semibold">Book a room</h1>
        <p className="text-base-content/70 mt-1 text-base">{meetingName}</p>

        {!hasIntersections ? (
          <div className="alert alert-warning mt-6 text-base">
            <span>
              No overlapping availability yet. Room booking needs at least one
              timeslot where participants are available.
            </span>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            <p className="text-base-content/60 text-base">
              {intersectionSlotKeys.length} best time
              {intersectionSlotKeys.length === 1 ? "" : "s"} ·{" "}
              {intersectionCount} participant
              {intersectionCount === 1 ? "" : "s"}
            </p>

            <section className="grid gap-2">
              <span className="text-base font-medium">Time</span>
              {hasMultipleIntersections ? (
                <BookingTimePicker
                  slotKeys={intersectionSlotKeys}
                  formattedDates={formattedDates}
                  selectedSlotKeys={selectedSlotKeys}
                  bookingSlotKey={bookingSlotKey}
                  onToggleSlotKey={handleToggleSlotKey}
                />
              ) : (
                bookingSlotKey && (
                  <p className="text-base">
                    <span className="font-medium">{bookingSlotLabel}</span>
                    <span className="text-base-content/60">
                      {" "}
                      · {formatReservationRange(bookingSlotKey)}
                    </span>
                  </p>
                )
              )}
            </section>

            {isRoomsError && (
              <div className="alert alert-error text-base">
                <span>{formatApiErrorMessage(roomsError)}</span>
              </div>
            )}

            <section className="grid gap-2">
              <span className="text-base font-medium">Room</span>
              {isRoomsPending ? (
                <div className="skeleton h-10 w-full" />
              ) : (
                <select
                  className={cn(
                    "select select-bordered bg-base-100 w-full text-base",
                    "hover:border-base-content/25 focus:border-primary focus:outline-none",
                    !canPickRoom && "cursor-not-allowed opacity-60",
                  )}
                  value={selectedRoomId ?? ""}
                  disabled={!canPickRoom || !hasFreeRooms}
                  onChange={(event) =>
                    setSelectedRoomId(event.target.value || null)
                  }
                >
                  <option value="" disabled>
                    {roomSelectPlaceholder}
                  </option>
                  {sortedAvailableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.title}
                      {room.capacity ? ` · ${room.capacity}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedSlotKeys.size > 0 && isAvailabilityError && (
                <p className="text-error text-base">
                  {formatApiErrorMessage(availabilityError)}
                </p>
              )}
            </section>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={!selectedRoom || !bookingSlotKey || isBookingRoom}
                onClick={handleBookClick}
              >
                Book room
              </button>

              {bookingSlotRange && (
                <Link
                  to="/room-booking"
                  search={{ d: bookingSlotRange.scrollTimestamp }}
                  className="btn btn-ghost"
                >
                  Timeline
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {bookingSlotKey && (
        <RoomBookingConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          meetingName={meetingName}
          formattedDates={formattedDates}
          slotKey={bookingSlotKey}
          room={confirmRoom}
          intersectionCount={intersectionCount}
          isPending={isBookingRoom}
          onConfirm={handleConfirmBooking}
        />
      )}
    </>
  );
}
