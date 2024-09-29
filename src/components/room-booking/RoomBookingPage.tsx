import { BookModal } from "@/components/room-booking/BookModal.tsx";
import { components } from "@/lib/room-booking";
import { lazy, useState } from "react";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export type BookingData = {
  from: Date;
  to: Date;
  room: components["schemas"]["Room"];
};

export function RoomBookingPage() {
  const [bookingModalData, setBookingModalData] = useState<BookingData>();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <BookingTimeline
        className="flex max-h-full"
        onBooking={(data) => {
          setBookingModalData(data);
          setModalOpen(true);
        }}
      />
      <BookModal
        data={bookingModalData}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
