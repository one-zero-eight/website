import { roomBookingTypes } from "@/api/room-booking";
import { BookModal } from "@/components/room-booking/BookModal.tsx";
import { lazy, Suspense, useState } from "react";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/BookingTimeline.tsx"),
);

export type BookingData = {
  from: Date;
  to: Date;
  room: roomBookingTypes.SchemaRoom;
};

export function RoomBookingPage() {
  const [bookingModalData, setBookingModalData] = useState<BookingData>();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <Suspense>
        <BookingTimeline
          className="flex max-h-full"
          onBooking={(data: BookingData) => {
            setBookingModalData(data);
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
