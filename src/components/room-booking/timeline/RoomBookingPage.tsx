import { $accounts } from "@/api/accounts";
import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
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

/** Set to true to preview the Outlook-down screen without fetching bookings. */
const showOutlookDownScreen = false;

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
        offsetMs: -T.Min * 20,
        position: "left",
      });
    }
  }, [timelineLoaded, search.d]);

  const { startDate, endDate } = getTimeRangeForWeek(0, 7);

  const { me } = useMe();
  const { isFetched: isMeFetched } = $accounts.useQuery("get", "/users/me");
  const { data: myAccessList, isFetched: isAccessListFetched } =
    $roomBooking.useQuery("get", "/rooms/my-access-list");
  const myAccessListRoomIds = myAccessList?.map((room) => room.id) ?? [];

  const { data: rooms, isPending: isRoomsPending } = $roomBooking.useQuery(
    "get",
    "/rooms/",
    { params: { query: { include_red: true } } },
  );

  const roomsToShow =
    rooms?.filter(
      (room) =>
        // Always show yellow
        room.access_level === RoomAccess_levelAnyOf0.yellow ||
        // If you are a staff, show red
        (room.access_level === RoomAccess_levelAnyOf0.red &&
          me?.innopolis_info?.is_staff) ||
        // Also show rooms you have access to, even if they are red or special-access
        myAccessListRoomIds.includes(room.id),
    ) ?? [];

  const areBookingsDepsReady =
    !isRoomsPending && !!rooms && isAccessListFetched && isMeFetched;

  const bookingsQueryEnabled =
    !showOutlookDownScreen && areBookingsDepsReady && roomsToShow.length > 0;

  const {
    data: rawBookings,
    isPending: isBookingsPending,
    isFetched: isBookingsFetched,
    status: bookingsStatus,
    error: bookingsError,
  } = $roomBooking.useQuery(
    "get",
    "/bookings/",
    {
      params: {
        query: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          room_ids: roomsToShow.map((room) => room.id),
        },
      },
    },
    {
      enabled: bookingsQueryEnabled,
      refetchInterval: 5 * T.Min,
      retry: (failureCount, error) => {
        const httpCode =
          typeof error === "object" &&
          error !== null &&
          "httpCode" in error &&
          typeof error.httpCode === "number"
            ? error.httpCode
            : null;
        if (httpCode !== null && (httpCode === 429 || httpCode >= 500)) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: 3 * T.Sec,
    },
  );

  const bookingsFetchFailed =
    showOutlookDownScreen ||
    (bookingsQueryEnabled &&
      isBookingsFetched &&
      bookingsStatus === "error" &&
      !!bookingsError);

  const bookings = rawBookings?.map((schema) => schemaToBooking(schema));

  return (
    <>
      <div className="grow overflow-hidden">
        <Suspense>
          {!bookingsFetchFailed ? (
            <BookingTimeline
              className={`h-full ${!areBookingsDepsReady || !bookingsQueryEnabled || isBookingsPending ? "pointer-events-none select-none" : ""}`}
              startDate={startDate}
              endDate={endDate}
              rooms={roomsToShow}
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
              <h1 className="m-4 text-center text-lg">
                Most probably Outlook API is down
              </h1>
              <p className="text-base-content/70 mx-4 text-center text-sm">
                Try to Reload this page.
              </p>
              <p className="text-base-content/15 mx-4 py-3 text-center text-sm">
                <span className="block">
                  Our kittens are working on resolving this problem
                </span>
                <span className="block font-sans">₍^.&nbsp;&nbsp;.^₎⟆</span>
              </p>
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
