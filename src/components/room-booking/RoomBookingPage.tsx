import { BookModal } from "@/components/room-booking/BookModal.tsx";
import { lazy, Suspense, useState } from "react";
import type { Slot } from "./BookingTimeline.vue";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [bookingModalData, setBookingModalData] = useState<Slot>();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <Suspense>
        <BookingTimeline
          className="h-full"
          onBook={(newBooking: Slot) => {
            setBookingModalData(newBooking);
            setModalOpen(true);
          }}
        />
      </Suspense>
      <BookModal
        data={bookingModalData}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
