import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking, roomBookingTypes } from "@/api/room-booking";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";
import { DeleteBookingModal } from "@/components/room-booking/list/DeleteBookingModal.tsx";
import { clockTime, durationFormatted, msBetween } from "@/lib/utils/dates.ts";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import React, { useMemo, useState } from "react";

export function BookingsListPage() {
  const { me } = useMe();
  const { data: bookings } = $roomBooking.useQuery("get", "/bookings/my");

  if (!me) {
    return <AuthWall />;
  }

  if (bookings === undefined) {
    // Loading...
    return <></>;
  }

  if (bookings.length === 0) {
    // No bookings
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 self-center">
        <h2 className="text-2xl text-inactive">You have no bookings</h2>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 self-center p-4">
      {bookings.map((v, i) => (
        <React.Fragment key={v.id}>
          <BookingCard booking={v} />
          {i < bookings.length - 1 && (
            <div className="h-[1px] bg-secondary-hover" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function BookingCard({
  booking,
}: {
  booking: roomBookingTypes.SchemaMyUniBooking;
}) {
  const queryClient = useQueryClient();
  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/");
  const room = rooms?.find((v) => v.id === booking.room_id);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { mutate: deleteBookingMutate, isPending } = $roomBooking.useMutation(
    "delete",
    "/bookings/{booking_id}",
    {
      onSettled() {
        queryClient.invalidateQueries({
          queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
        });
        queryClient.invalidateQueries({
          // All /bookings/ queries, with any params
          queryKey: ["roomBooking", "get", "/bookings/"],
        });
      },
    },
  );
  const deleteBooking = () => {
    deleteBookingMutate({
      params: { path: { booking_id: booking.id } },
    });
  };

  const start = useMemo(() => new Date(booking.start), [booking.start]);
  const end = useMemo(() => new Date(booking.end), [booking.end]);

  return (
    <>
      <div className="group flex flex-row rounded-lg border-[1px] border-primary-hover bg-primary-main px-4 py-2">
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
        <div
          className={clsx(
            "flex flex-row items-center gap-2 group-hover:visible",
            isPending ? "visible" : "invisible",
          )}
        >
          <Tooltip content="Show on timeline">
            <Link
              to="/room-booking"
              search={{ d: new Date(booking.start).getTime() }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-icon-main/50 hover:bg-secondary-hover"
            >
              <span className="icon-[tabler--list-search] text-2xl" />
            </Link>
          </Tooltip>

          <Tooltip content="Delete booking">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md border-[1px] border-red-400 bg-red-200 text-red-600 hover:bg-red-300 dark:border-red-600 dark:bg-red-800 dark:text-red-400 dark:hover:bg-red-700"
              onClick={() => setConfirmDialogOpen(true)}
            >
              {!isPending ? (
                <span className="icon-[material-symbols--close-rounded] text-2xl" />
              ) : (
                <span className="icon-[mdi--loading] animate-spin text-2xl text-icon-main" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>
      <DeleteBookingModal
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={() => {
          deleteBooking();
          setConfirmDialogOpen(false);
        }}
      />
    </>
  );
}
