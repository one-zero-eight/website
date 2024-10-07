import { BookModal } from "@/components/room-booking/BookModal.tsx";
import { lazy, Suspense, useState } from "react";
import type { NewBooking } from "./BookingTimeline.vue";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export function RoomBookingPage() {
  const [bookingModalData, setBookingModalData] = useState<NewBooking>();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <Suspense>
        <BookingTimeline
          className="flex max-h-full"
          onBook={(newBooking: NewBooking) => {
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
