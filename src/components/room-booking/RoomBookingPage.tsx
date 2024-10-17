import { lazy, Suspense, useState } from "react";
import type { Booking, Slot } from "./BookingTimeline.vue";
import { BookingModal } from "@/components/room-booking/BookingModal.tsx";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingSlot, setNewBookingSlot] = useState<Slot>();
  const [bookingDetails, setBookingDetails] = useState<Booking>();

  return (
    <>
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
      <BookingModal
        newSlot={newBookingSlot}
        detailsBooking={bookingDetails}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
