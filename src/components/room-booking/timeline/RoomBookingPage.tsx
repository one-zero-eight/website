import { $roomBooking } from "@/api/room-booking";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { T } from "@/lib/utils/dates.ts";
import { getRouteApi } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getTimeRangeForWeek } from "../utils.ts";
import {
  type Booking,
  schemaToBooking,
  type ScrollToOptions,
  type Slot,
} from "./types.ts";

const BookingTimeline = lazy(
  () => import("@/components/room-booking/timeline/BookingTimeline.tsx"),
);

type TimelineRef = {
  __veauryVueRef__: {
    scrollTo: (options: ScrollToOptions) => void;
  };
};

const routeApi = getRouteApi("/_with_menu/room-booking/");

export function RoomBookingPage({ showRed }: { showRed?: boolean }) {
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
        offsetMs: -T.Min * 20,
        position: "left",
      });
    }
  }, [timelineLoaded, search.d]);

  const { startDate, endDate } = getTimeRangeForWeek();

  const includeRedObject = showRed ? { include_red: true } : {};
  const { data: rooms, isPending: isRoomsPending } = $roomBooking.useQuery(
    "get",
    "/rooms/",
    { params: { query: { ...includeRedObject } } },
  );
  const {
    data: rawBookings,
    isPending: isBookingsPending,
    error: bookingsError,
    status: bookingsStatus,
  } = $roomBooking.useQuery(
    "get",
    "/bookings/",
    {
      params: {
        query: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          ...includeRedObject,
        },
      },
    },
    {
      refetchInterval: 5 * T.Min,
    },
  );

  const bookings = rawBookings?.map((schema) => schemaToBooking(schema));

  return (
    <>
      <div className="grow overflow-hidden">
        <Suspense>
          {bookingsStatus !== "error" ? (
            <BookingTimeline
              className={`h-full ${bookingsStatus === "pending" ? "pointer-events-none select-none" : ""}`}
              startDate={startDate}
              endDate={endDate}
              rooms={rooms}
              isRoomsPending={isRoomsPending}
              bookings={bookings}
              isBookingsPending={isBookingsPending}
              /* myBookings={myBookings} */
              /* isMyBookingsPending={isMyBookingsPending} */
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
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <section className="relative h-screen w-full overflow-hidden text-[#feda4a]">
                <div className="absolute inset-0 [perspective:1000px]">
                  <div className="animate-booking-error absolute top-full left-1/2 w-[190vw] -translate-x-1/2 text-center font-bold tracking-wide uppercase [transform-style:preserve-3d]">
                    <p className="mb-6 text-2xl md:text-4xl">
                      Error loading bookings
                    </p>
                    <h1 className="mb-8 text-4xl leading-tight md:text-7xl">
                      Most probably Outlook API is down
                    </h1>

                    <div className="space-y-6 text-lg leading-[1.8] md:text-3xl">
                      <p>{bookingsError?.detail?.toString()}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Suspense>
      </div>
      <BookingModal
        newSlot={newBookingSlot}
        detailsBooking={bookingDetails}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onBookingCreated={(data) => {
          console.log("booking created", data);

          setNewBookingSlot(undefined);
          setBookingDetails(data);
        }}
      />
    </>
  );
}
