import { useMe } from "@/api/accounts/user.ts";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { BookingModal } from "@/components/room-booking/BookingModal.tsx";
import { lazy, Suspense, useState } from "react";
import type { Booking, Slot } from "./BookingTimeline.vue";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingSlot, setNewBookingSlot] = useState<Slot>();
  const [bookingDetails, setBookingDetails] = useState<Booking>();

  const { me } = useMe();

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
