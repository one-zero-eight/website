import type { roomBookingTypes } from "@/api/room-booking";

export type Room = roomBookingTypes.SchemaRoom & {
  /** Index of the room in the list of all rooms on the timeline. */
  idx: number;
};

export type Booking = Omit<roomBookingTypes.SchemaBooking, "start" | "end"> & {
  id: string;
  startsAt: Date;
  endsAt: Date;
  myBookingId: number | undefined;
};

export type Slot = {
  room: Room;
  start: Date;
  end: Date;
};

export type ScrollToOptions = {
  /** Date to scroll to. */
  to: Date;
  /** Behavior of scroll. */
  behavior?: "smooth" | "instant";
  /** Position where the target date should be aligned. */
  position?: "left" | "center" | "right";
  /** Offset to shift the target position by. */
  offsetMs?: number;
};
