import { $roomBooking, roomBookingTypes } from "@/api/room-booking";
import Tooltip from "@/components/common/Tooltip.tsx";
import { DeleteBookingModal } from "@/components/room-booking/bookings-list/DeleteBookingModal.tsx";
import { clockTime, durationFormatted, msBetween } from "@/lib/utils/dates.ts";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { getTimeRangeForWeek } from "../utils";

export function BookingsListPage() {
  const { data: bookings } = $roomBooking.useQuery("get", "/bookings/my");

  if (bookings === undefined) {
    // Loading...
    return <></>;
  }

  if (bookings.length === 0) {
    // No bookings
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
        <h2 className="text-inh-inactive text-2xl">You have no bookings</h2>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
      {bookings.map((v, i) => (
        <React.Fragment key={v.room_id}>
          <BookingCard booking={v} />
          {i < bookings.length - 1 && (
            <div className="bg-inh-secondary-hover h-px" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function BookingCard({
  booking,
}: {
  booking: roomBookingTypes.SchemaBooking;
}) {
  const queryClient = useQueryClient();
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");
  const room = rooms?.find((v) => v.id === booking.room_id);

  const [error, setError] = useState<string | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { startDate, endDate } = getTimeRangeForWeek();
  const { mutate: deleteBookingMutate, isPending } = $roomBooking.useMutation(
    "delete",
    "/bookings/{outlook_booking_id}",
    {
      onSuccess: () => {
        setConfirmDialogOpen(false);
        queryClient.setQueryData(
          $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          (old: roomBookingTypes.SchemaBooking[] | undefined) =>
            old?.filter((b) => b.id !== booking.id) ?? [],
        );

        queryClient.setQueryData(
          $roomBooking.queryOptions("get", "/bookings/", {
            params: {
              query: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
            },
          }).queryKey,
          (old: roomBookingTypes.SchemaBooking[] | undefined) =>
            old?.filter((b) => b.id !== booking.id) ?? [],
        );

        queryClient.setQueryData(
          $roomBooking.queryOptions("get", "/room/{id}/bookings", {
            params: {
              path: { id: booking.room_id },
              query: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
            },
          }).queryKey,
          (old: roomBookingTypes.SchemaBooking[] | undefined) =>
            old?.filter((b) => b.id !== booking.id) ?? [],
        );
      },
      onError: (error) => {
        console.log(error);
        setError("Failed to delete booking");
      },
    },
  );
  const deleteBooking = () => {
    deleteBookingMutate({
      params: {
        path: { outlook_booking_id: booking.outlook_booking_id ?? "" },
      },
    });
  };

  const start = useMemo(() => new Date(booking.start), [booking.start]);
  const end = useMemo(() => new Date(booking.end), [booking.end]);

  return (
    <>
      <div className="group border-inh-primary-hover bg-inh-primary rounded-field flex flex-row border px-4 py-2">
        <div className="flex grow flex-col">
          <h2 className="text-gray-900 dark:text-gray-100">{booking.title}</h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            <span>{room?.title}</span>
            <span className="text-gray-400 dark:text-gray-700"> • </span>
            <span>
              {start.toLocaleString("en-US", {
                day: "numeric",
                month: "short",
              })}
              , {start.toLocaleString("en-US", { weekday: "short" })}
            </span>
            <span className="text-gray-400 dark:text-gray-700"> • </span>
            <span>
              {`${clockTime(start)}–${clockTime(end)} (${durationFormatted(msBetween(start, end))})`}
            </span>
          </p>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Tooltip content="Show on timeline">
            <Link
              to="/room-booking"
              search={{ d: new Date(booking.start).getTime() }}
              className="text-base-content/50 hover:bg-inh-secondary-hover flex h-8 w-8 items-center justify-center rounded-md"
            >
              <span className="icon-[tabler--list-search] text-2xl" />
            </Link>
          </Tooltip>

          <Tooltip content="Delete booking">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-red-400 bg-red-200 text-red-600 hover:bg-red-300 dark:border-red-600 dark:bg-red-800 dark:text-red-400 dark:hover:bg-red-700"
              onClick={() => setConfirmDialogOpen(true)}
            >
              <span className="icon-[material-symbols--close-rounded] text-2xl" />
            </button>
          </Tooltip>
        </div>
      </div>
      <DeleteBookingModal
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={() => {
          deleteBooking();
        }}
        isPending={isPending}
        error={error}
      />
    </>
  );
}
