import type { roomBookingTypes } from "@/api/room-booking";

export type MeetingRoomBooking = {
  id?: string;
  slotKey: string;
  roomId: string;
  roomNumber?: string;
  roomTitle: string;
  start: string;
  end: string;
};

const STORAGE_PREFIX = "when2meet-room-booking:";

function getStorageKey(meetingId: string) {
  return `${STORAGE_PREFIX}${meetingId}`;
}

export function loadMeetingRoomBooking(meetingId: string) {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const rawValue = localStorage.getItem(getStorageKey(meetingId));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as MeetingRoomBooking;
  } catch {
    return null;
  }
}

export function saveMeetingRoomBooking(
  meetingId: string,
  booking: MeetingRoomBooking,
) {
  localStorage.setItem(getStorageKey(meetingId), JSON.stringify(booking));
}

export function clearMeetingRoomBooking(meetingId: string) {
  localStorage.removeItem(getStorageKey(meetingId));
}

export function isStoredMeetingRoomBookingActive(
  storedBooking: MeetingRoomBooking,
  bookings: Pick<
    roomBookingTypes.SchemaBooking,
    "id" | "room_id" | "start" | "end"
  >[],
) {
  return bookings.some(
    (booking) =>
      (storedBooking.id && booking.id === storedBooking.id) ||
      (booking.room_id === storedBooking.roomId &&
        booking.start === storedBooking.start &&
        booking.end === storedBooking.end),
  );
}
