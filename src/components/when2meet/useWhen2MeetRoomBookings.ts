import { $roomBooking } from "@/api/room-booking";
import type { roomBookingTypes } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const EXTRA_ROOM_BATCH_SIZE = 6;

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function useWhen2MeetRoomBookings({
  bookableRooms,
  start,
  end,
  enabled,
}: {
  bookableRooms: roomBookingTypes.SchemaRoom[];
  start: string | undefined;
  end: string | undefined;
  enabled: boolean;
}) {
  const bookableRoomIds = useMemo(
    () => new Set(bookableRooms.map((room) => room.id)),
    [bookableRooms],
  );

  const extraRoomIds = useMemo(
    () =>
      bookableRooms
        .filter((room) => room.access_level !== RoomAccess_levelAnyOf0.yellow)
        .map((room) => room.id),
    [bookableRooms],
  );

  const extraRoomBatches = useMemo(
    () => chunkItems(extraRoomIds, EXTRA_ROOM_BATCH_SIZE),
    [extraRoomIds],
  );

  const yellowBookingsQuery = useQuery({
    ...$roomBooking.queryOptions("get", "/bookings/", {
      params: {
        query: {
          start: start ?? new Date().toISOString(),
          end: end ?? new Date().toISOString(),
          include_red: false,
        },
      },
    }),
    enabled: enabled && !!start && !!end,
    retry: 2,
  });

  const extraRoomQueries = useQueries({
    queries: extraRoomBatches.map((roomIds) => ({
      ...$roomBooking.queryOptions("get", "/bookings/", {
        params: {
          query: {
            start: start ?? new Date().toISOString(),
            end: end ?? new Date().toISOString(),
            room_ids: roomIds,
          },
        },
      }),
      enabled: enabled && !!start && !!end && roomIds.length > 0,
      retry: 2,
    })),
  });

  const bookings = useMemo(() => {
    const bookingsById = new Map<string, roomBookingTypes.SchemaBooking>();

    for (const booking of yellowBookingsQuery.data ?? []) {
      if (bookableRoomIds.has(booking.room_id)) {
        bookingsById.set(booking.id, booking);
      }
    }

    for (const query of extraRoomQueries) {
      for (const booking of query.data ?? []) {
        if (bookableRoomIds.has(booking.room_id)) {
          bookingsById.set(booking.id, booking);
        }
      }
    }

    return [...bookingsById.values()];
  }, [yellowBookingsQuery.data, extraRoomQueries, bookableRoomIds]);

  const isPending =
    yellowBookingsQuery.isPending ||
    extraRoomQueries.some((query) => query.isPending);
  const isError =
    yellowBookingsQuery.isError ||
    extraRoomQueries.some((query) => query.isError);
  const error =
    yellowBookingsQuery.error ??
    extraRoomQueries.find((query) => query.error)?.error;

  return {
    bookings,
    isPending,
    isError,
    error,
  };
}
