import { BookModal } from "@/components/room-booking/BookModal.tsx";
import { ViewBookingModal } from "@/components/room-booking/ViewBookingModal.tsx";
import { lazy, Suspense, useState } from "react";
import type { Booking, Slot } from "./BookingTimeline.vue";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [bookingModalData, setBookingModalData] = useState<Slot>();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewBookingModalData, setViewBookingModalData] = useState<Booking>();
  const [viewModalOpen, setViewModalOpen] = useState(false);

  return (
    <>
      <Suspense>
        <BookingTimeline
          className="h-full"
          onBook={(newBooking: Slot) => {
            setBookingModalData(newBooking);
            setModalOpen(true);
          }}
          onBookingClick={(booking: Booking) => {
            setViewBookingModalData(booking);
            setViewModalOpen(true);
          }}
        />
      </Suspense>
      <BookModal
        data={bookingModalData}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
      <ViewBookingModal
        data={viewBookingModalData}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />
    </>
  );
}
