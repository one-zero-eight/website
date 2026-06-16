import { $accounts } from "@/api/accounts";
import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking } from "@/api/room-booking";
import { RoomAccess_levelAnyOf0 } from "@/api/room-booking/types.ts";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { OutlookDownScreen } from "@/components/room-booking/timeline/OutlookDownScreen.tsx";
import { T } from "@/lib/utils/dates.ts";
import { getRouteApi } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getTimeRangeForWeek } from "../utils.ts";
import { type Booking, schemaToBooking, type Slot } from "./types.ts";
import type { BookingTimelineRef } from "./BookingTimeline.tsx";

const BookingTimeline = lazy(() =>
  import("@/components/room-booking/timeline/BookingTimeline.tsx").then(
    (m) => ({ default: m.BookingTimeline }),
  ),
);

const routeApi = getRouteApi("/_with_menu/room-booking/");

export function RoomBookingPage() {
  const search = routeApi.useSearch();
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingSlot, setNewBookingSlot] = useState<Slot>();
  const [bookingDetails, setBookingDetails] = useState<Booking>();
  const timelineRef = useRef<BookingTimelineRef | null>(null);
  const [timelineLoaded, setTimelineLoaded] = useState(false);

  const setTimelineRef = (x: BookingTimelineRef | null) => {
    timelineRef.current = x;
    setTimelineLoaded(!!x);
  };

  useEffect(() => {
    if (timelineLoaded && search.d) {
      timelineRef.current?.scrollTo({
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

  const { data: statusData, isFetched: isStatusFetched } =
    $roomBooking.useQuery("get", "/status", undefined, {
      refetchInterval: T.Min,
      retry: 3,
    });
  const lastStatus = statusData?.uptime?.[statusData.uptime.length - 1];
  const isOutlookDown = isStatusFetched && lastStatus?.status !== 1;

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
    !isOutlookDown && areBookingsDepsReady && roomsToShow.length > 0;

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
    isOutlookDown ||
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
          ) : isOutlookDown && statusData?.uptime?.length ? (
            <OutlookDownScreen />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <span className="icon-[material-symbols--cloud-off] text-error mb-2 text-5xl" />
              <h1 className="text-lg font-semibold">
                Outlook API is currently unavailable
              </h1>
              <p className="text-base-content/70 mt-1 max-w-sm text-sm">
                Room booking relies on the Outlook calendar service, which
                appears to be down right now. We have been notified about this.
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
