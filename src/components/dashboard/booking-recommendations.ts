import type { roomBookingTypes } from "@/api/room-booking";
import { BookingStatus } from "@/api/room-booking/types.ts";

export type BookingRecommendation =
  | {
      kind: "booked";
      roomId: string;
      roomTitle: string;
      booking: roomBookingTypes.SchemaBooking;
    }
  | {
      kind: "available";
      roomId: string;
      roomTitle: string;
      availableUntilMs: number;
      nextBookingKnown: boolean;
    };

export type BookingRecommendationsInput = {
  rooms: readonly roomBookingTypes.SchemaRoom[];
  myBookings: readonly roomBookingTypes.SchemaBooking[];
  allBookings: readonly roomBookingTypes.SchemaBooking[];
  myAccessList: readonly roomBookingTypes.SchemaRoom[];
  role: { is_student?: boolean; is_staff?: boolean };
  nowMs: number;
  rangeEndMs: number;
};

type RoomOccupancy = {
  unsafe: boolean;
  occupied: boolean;
  nextStartMs: number;
  currentMine?: roomBookingTypes.SchemaBooking;
};

const moscowTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow",
  weekday: "short",
  hour: "2-digit",
  hourCycle: "h23",
});

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareRooms(a: BookingRecommendation, b: BookingRecommendation) {
  return (
    compareText(a.roomTitle, b.roomTitle) || compareText(a.roomId, b.roomId)
  );
}

function isRestrictedTime(nowMs: number) {
  const parts = moscowTime.formatToParts(nowMs);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return weekday !== "Sat" && weekday !== "Sun" && hour >= 8 && hour < 19;
}

function canSuggestRoom(
  room: roomBookingTypes.SchemaRoom,
  role: BookingRecommendationsInput["role"],
  hasSpecialAccess: boolean,
  restrictedTime: boolean,
) {
  if (!role.is_student && !role.is_staff) return false;
  if (hasSpecialAccess) return true;
  if (role.is_staff) {
    return room.access_level === "yellow" || room.access_level === "red";
  }
  return (
    room.access_level === "yellow" &&
    (!room.restrict_daytime || !restrictedTime)
  );
}

function parseBookingTime(value: string) {
  // Require offset-aware API dates, rejecting local-time ambiguity and dates
  // Date.parse silently normalizes (e.g. February 30 or 24:00).
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(
      value,
    );
  if (!parts) return NaN;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return NaN;
  return Date.parse(value);
}

/**
 * Current own bookings first, then up to five rooms with the longest free-now
 * occupancy windows. These windows do not promise permission to reserve their
 * full duration: the booking UI must still enforce duration/daytime rules.
 * Missing horizon/access metadata can still show valid current own bookings.
 */
export function buildBookingRecommendations({
  rooms,
  myBookings,
  allBookings,
  myAccessList,
  role,
  nowMs,
  rangeEndMs,
}: BookingRecommendationsInput): BookingRecommendation[] {
  if (!Number.isFinite(new Date(nowMs).getTime())) return [];

  const occupancy = new Map<string, RoomOccupancy>();
  function addBooking(booking: roomBookingTypes.SchemaBooking, mine: boolean) {
    if (
      booking.room_response === BookingStatus.Decline ||
      booking.attendees?.some(
        (attendee) =>
          attendee.assosiated_room_id === booking.room_id &&
          attendee.status === BookingStatus.Decline,
      )
    ) {
      return;
    }
    const state = occupancy.get(booking.room_id) ?? {
      unsafe: false,
      occupied: false,
      nextStartMs: Infinity,
    };
    occupancy.set(booking.room_id, state);
    const startMs = parseBookingTime(booking.start);
    const endMs = parseBookingTime(booking.end);
    if (
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      startMs >= endMs
    ) {
      state.unsafe = true;
      return;
    }
    if (startMs <= nowMs && nowMs < endMs) {
      state.occupied = true;
      // Stable selection if multiple current own entries refer to this room.
      const current = state.currentMine;
      if (
        mine &&
        (!current ||
          startMs < Date.parse(current.start) ||
          (startMs === Date.parse(current.start) &&
            (endMs < Date.parse(current.end) ||
              (endMs === Date.parse(current.end) &&
                compareText(booking.id, current.id) < 0))))
      ) {
        state.currentMine = booking;
      }
    } else if (startMs > nowMs) {
      state.nextStartMs = Math.min(state.nextStartMs, startMs);
    }
  }

  // Do not deduplicate by booking ID: stale responses may disagree on intervals.
  for (const booking of allBookings) addBooking(booking, false);
  for (const booking of myBookings) addBooking(booking, true);

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const ownBookingsByRoom = new Map<string, roomBookingTypes.SchemaBooking>();

  for (const booking of myBookings) {
    if (
      booking.room_response === BookingStatus.Decline ||
      booking.attendees?.some(
        (attendee) =>
          attendee.assosiated_room_id === booking.room_id &&
          attendee.status === BookingStatus.Decline,
      )
    ) {
      continue;
    }
    const startMs = parseBookingTime(booking.start);
    const endMs = parseBookingTime(booking.end);
    if (
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      startMs >= endMs ||
      endMs <= nowMs
    ) {
      continue;
    }

    const state = occupancy.get(booking.room_id);
    if (state?.unsafe) continue;

    const existing = ownBookingsByRoom.get(booking.room_id);
    if (!existing) {
      ownBookingsByRoom.set(booking.room_id, booking);
    } else {
      const existingStart = parseBookingTime(existing.start);
      const existingEnd = parseBookingTime(existing.end);
      const existingOngoing = existingStart <= nowMs && existingEnd > nowMs;
      const currentOngoing = startMs <= nowMs && endMs > nowMs;
      if (currentOngoing && !existingOngoing) {
        ownBookingsByRoom.set(booking.room_id, booking);
      } else if (currentOngoing === existingOngoing) {
        if (
          startMs < existingStart ||
          (startMs === existingStart &&
            (endMs < existingEnd ||
              (endMs === existingEnd &&
                compareText(booking.id, existing.id) < 0)))
        ) {
          ownBookingsByRoom.set(booking.room_id, booking);
        }
      }
    }
  }

  const booked: BookingRecommendation[] = [];
  for (const [roomId, booking] of ownBookingsByRoom) {
    booked.push({
      kind: "booked",
      roomId,
      roomTitle: roomById.get(roomId)?.title ?? roomId,
      booking,
    });
  }

  booked.sort((a, b) => {
    if (a.kind !== "booked" || b.kind !== "booked") return 0;
    const aStart = parseBookingTime(a.booking.start);
    const bStart = parseBookingTime(b.booking.start);
    const aOngoing = aStart <= nowMs;
    const bOngoing = bStart <= nowMs;
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    return aStart - bStart || compareRooms(a, b);
  });

  if (
    booked.length >= 5 ||
    !Number.isFinite(new Date(rangeEndMs).getTime()) ||
    rangeEndMs <= nowMs ||
    (!role.is_student && !role.is_staff)
  ) {
    return booked.slice(0, 5);
  }

  const bookedRoomIds = new Set(booked.map((b) => b.roomId));
  const specialAccess = new Set(myAccessList.map((room) => room.id));
  const restrictedTime = isRestrictedTime(nowMs);
  const available: Extract<BookingRecommendation, { kind: "available" }>[] = [];
  for (const room of roomById.values()) {
    const state = occupancy.get(room.id);
    if (state?.unsafe || state?.occupied || bookedRoomIds.has(room.id))
      continue;
    if (
      !canSuggestRoom(room, role, specialAccess.has(room.id), restrictedTime)
    ) {
      continue;
    }
    const nextStartMs = state?.nextStartMs ?? Infinity;
    const nextBookingKnown = nextStartMs < rangeEndMs;
    available.push({
      kind: "available",
      roomId: room.id,
      roomTitle: room.title,
      availableUntilMs: nextBookingKnown ? nextStartMs : rangeEndMs,
      nextBookingKnown,
    });
  }
  available.sort(
    (a, b) => b.availableUntilMs - a.availableUntilMs || compareRooms(a, b),
  );
  return [...booked, ...available].slice(0, 5);
}
