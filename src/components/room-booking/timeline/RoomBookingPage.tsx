import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import { lazy, Suspense, useState } from "react";
import type { Booking, Slot } from "./BookingTimeline.vue";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/timeline/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingSlot, setNewBookingSlot] = useState<Slot>();
  const [bookingDetails, setBookingDetails] = useState<Booking>();

  const { me } = useMe();

  const [startDate] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
  const [endDate] = useState(new Date(startDate.getTime() + 7 * T.Day));

  const { data: rooms, isPending: isRoomsPending } = $roomBooking.useQuery(
    "get",
    "/rooms/",
  );
  const { data: bookings, isPending: isBookingsPending } =
    $roomBooking.useQuery(
      "get",
      "/bookings/",
      {
        params: {
          query: { start: startDate.toISOString(), end: endDate.toISOString() },
        },
      },
      {
        refetchInterval: 5 * T.Min,
      },
    );
  const { data: myBookings, isPending: isMyBookingsPending } =
    $roomBooking.useQuery("get", "/bookings/my");

  if (!me) {
    return (
      <>
        <h2 className="my-4 text-3xl font-medium">Sign in to get access</h2>
        <p className="mb-4 text-lg text-text-secondary/75">
          Access convenient booking service with your Innopolis account.
        </p>
        <SignInButton />
      </>
    );
  }

  return (
    <>
      <div className="grow overflow-hidden">
        <Suspense>
          <BookingTimeline
            className="h-full"
            startDate={startDate}
            endDate={endDate}
            rooms={rooms}
            isRoomsPending={isRoomsPending}
            bookings={bookings}
            isBookingsPending={isBookingsPending}
            myBookings={myBookings}
            isMyBookingsPending={isMyBookingsPending}
            onBook={(newBooking: Slot) => {
              setNewBookingSlot(newBooking);
              setBookingDetails(undefined);
              setModalOpen(true);
            }}
            onBookingClick={(booking: Booking) => {
              setBookingDetails(booking);
              setNewBookingSlot(undefined);
              setModalOpen(true);
            }}
          />
        </Suspense>
      </div>
      <BookingModal
        newSlot={newBookingSlot}
        detailsBooking={bookingDetails}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
