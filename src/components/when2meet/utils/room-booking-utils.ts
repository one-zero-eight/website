import type { roomBookingTypes } from "@/api/room-booking";
import { slotKeyToDateRange } from "./api-slots.ts";

export function bookingsOverlap(
  bookingStart: string,
  bookingEnd: string,
  slotStart: Date,
  slotEnd: Date,
) {
  const start = new Date(bookingStart).getTime();
  const end = new Date(bookingEnd).getTime();

  return start < slotEnd.getTime() && end > slotStart.getTime();
}

export function getSlotKeysRange(slotKeys: string[]) {
  if (slotKeys.length === 0) {
    return null;
  }

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  for (const slotKey of slotKeys) {
    const { start, end } = slotKeyToDateRange(slotKey);
    minStart = Math.min(minStart, start.getTime());
    maxEnd = Math.max(maxEnd, end.getTime());
  }

  return {
    start: new Date(minStart),
    end: new Date(maxEnd),
  };
}

export function getBusyRoomIdsForSlot(
  slotKey: string,
  bookings: Pick<roomBookingTypes.SchemaBooking, "room_id" | "start" | "end">[],
) {
  const { start, end } = slotKeyToDateRange(slotKey);
  const busyRoomIds = new Set<string>();

  for (const booking of bookings) {
    if (bookingsOverlap(booking.start, booking.end, start, end)) {
      busyRoomIds.add(booking.room_id);
    }
  }

  return busyRoomIds;
}

export function getAvailableRoomsForSlotKeys(
  slotKeys: string[],
  bookings: Pick<roomBookingTypes.SchemaBooking, "room_id" | "start" | "end">[],
  bookableRooms: roomBookingTypes.SchemaRoom[],
) {
  if (slotKeys.length === 0) {
    return [];
  }

  return bookableRooms.filter((room) =>
    slotKeys.every((slotKey) => {
      const busyRoomIds = getBusyRoomIdsForSlot(slotKey, bookings);

      return !busyRoomIds.has(room.id);
    }),
  );
}

export function formatReservationRange(slotKey: string) {
  const { start, end } = slotKeyToDateRange(slotKey);
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
}

export function getRoomNumber(
  room: Pick<roomBookingTypes.SchemaRoom, "id" | "short_name">,
) {
  return room.short_name || room.id;
}
