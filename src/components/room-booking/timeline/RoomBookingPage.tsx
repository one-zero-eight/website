import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Booking, ScrollToOptions, Slot } from "./BookingTimeline.vue";
import { getRouteApi } from "@tanstack/react-router";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/timeline/BookingTimeline.tsx"),
);

type TimelineRef = {
  __veauryVueRef__: {
    scrollTo: (options: ScrollToOptions) => void;
  };
};

const routeApi = getRouteApi("/_with_menu/room-booking/");

export function RoomBookingPage() {
  const search = routeApi.useSearch();
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingSlot, setNewBookingSlot] = useState<Slot>();
  const [bookingDetails, setBookingDetails] = useState<Booking>();
  const timelineRef = useRef<TimelineRef | null>(null);
  const [timelineLoaded, setTimelineLoaded] = useState(false);

  const setTimelineRef = (x: TimelineRef) => {
    timelineRef.current = x;
    setTimelineLoaded(true);
  };

  useEffect(() => {
    if (timelineLoaded && search.d) {
      timelineRef.current?.__veauryVueRef__.scrollTo({
        to: new Date(search.d),
        behavior: "smooth",
        offsetMs: T.Min * 20,
        position: "left",
      });
    }
  }, [timelineLoaded, search.d]);

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
    return <AuthWall />;
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
            ref={setTimelineRef}
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
