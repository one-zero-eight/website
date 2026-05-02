import { sanitizeBookingTitle } from "@/components/room-booking/utils";
import { memo } from "react";
import type { Booking } from "./types";
import type { BookingPosition } from "./utils";

export const BookingBar = memo(function BookingBar({
  booking,
  position,
  rowIndex,
  scrollX,
  sidebarWidth,
  rowHeight,
  onBookingClick,
}: {
  booking: Booking;
  position: BookingPosition;
  rowIndex: number;
  scrollX: number;
  sidebarWidth: number;
  rowHeight: number;
  onBookingClick: (booking: Booking) => void;
}) {
  const isMyBooking = booking.related_to_me;

  return (
    <div
      className="absolute px-0.5 py-1.5 whitespace-nowrap select-none"
      style={{
        left: sidebarWidth + position.offsetX - scrollX,
        top: rowIndex * rowHeight,
        width: position.length,
        height: rowHeight,
      }}
    >
      <div
        title={booking.title}
        data-booking-id={booking.id}
        onClick={() => onBookingClick(booking)}
        className={
          isMyBooking
            ? "flex h-full w-full cursor-pointer items-center rounded-sm border border-green-500 bg-green-400 px-3 text-green-900 shadow-sm dark:border-green-700 dark:bg-green-800 dark:text-green-500"
            : "bg-base-200 text-base-content border-base-300 flex h-full w-full cursor-pointer items-center rounded-sm border px-3 shadow-sm"
        }
      >
        <span
          className="overflow-hidden text-ellipsis"
          style={{
            position: "sticky",
            left: sidebarWidth + 6,
          }}
        >
          {sanitizeBookingTitle(booking.title)}
        </span>
      </div>
    </div>
  );
});
