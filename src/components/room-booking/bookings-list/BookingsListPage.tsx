import { $roomBooking, roomBookingTypes } from "@/api/room-booking";
import Tooltip from "@/components/common/Tooltip.tsx";
import { clockTime, durationFormatted, msBetween } from "@/lib/utils/dates.ts";
import { Link } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { BookingModal } from "../timeline/BookingModal";
import { schemaToBooking } from "../timeline/types";

export function BookingsListPage() {
  const {
    data: bookings,
    status,
    error,
  } = $roomBooking.useQuery("get", "/bookings/my");

  return status === "pending" ? (
    <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
      <span className="icon-[mdi--loading] text-base-content animate-spin text-4xl" />
    </div>
  ) : status === "error" ? (
    <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
      <h2 className="text-base-content/70 text-2xl">Error loading bookings</h2>
      <p className="text-base-content/75 text-lg">
        {error?.detail?.toString() || "Most probably Outlook API is down"}
      </p>
    </div>
  ) : bookings.length === 0 ? (
    <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
      <h2 className="text-base-content/70 text-2xl">You have no bookings</h2>
    </div>
  ) : (
    <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
      {bookings.map((v) => (
        <BookingCard booking={v} key={v.id} />
      ))}
    </div>
  );
}

export function BookingCard({
  booking,
}: {
  booking: roomBookingTypes.SchemaBooking;
}) {
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: { query: { include_red: true } },
  });
  const room = rooms?.find((v) => v.id === booking.room_id);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const start = useMemo(() => new Date(booking.start), [booking.start]);
  const end = useMemo(() => new Date(booking.end), [booking.end]);

  return (
    <>
      <div className="group bg-base-200 rounded-field flex flex-row px-4 py-2">
        <div className="flex grow flex-col">
          <h2 className="text-base-content font-medium">{booking.title}</h2>
          <p className="text-base-content/70">{room?.title}</p>
          <p className="text-base-content/70 flex flex-row gap-2">
            <span>
              {start.toLocaleString("en-US", {
                day: "numeric",
                month: "short",
              })}
              , {start.toLocaleString("en-US", { weekday: "short" })}
            </span>
            <span>
              {`${clockTime(start)}–${clockTime(end)} (${durationFormatted(msBetween(start, end))})`}
            </span>
          </p>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Tooltip content="Open details">
            <button
              onClick={() => setBookingModalOpen(true)}
              className="text-base-content/50 hover:bg-base-300 flex h-8 w-8 items-center justify-center rounded-md"
            >
              <span className="icon-[material-symbols--notes] text-3xl" />
            </button>
          </Tooltip>
          <Tooltip content="Show on timeline">
            <Link
              to="/room-booking"
              search={{ d: new Date(booking.start).getTime() }}
              className="text-base-content/50 hover:bg-base-300 flex h-8 w-8 items-center justify-center rounded-md"
            >
              <span className="icon-[material-symbols--search] text-3xl" />
            </Link>
          </Tooltip>
        </div>
      </div>
      <BookingModal
        detailsBooking={schemaToBooking(booking)}
        open={bookingModalOpen}
        onOpenChange={() => {
          setBookingModalOpen(false);
        }}
      />
    </>
  );
}
