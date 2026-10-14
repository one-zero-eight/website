import { $accounts } from "@/api/accounts";
import { $roomBooking } from "@/api/room-booking";
import { buildBookingRecommendations } from "./booking-recommendations.ts";

/** Stable per-day window: include overnight bookings and inspect two weeks ahead. */
export function getBookingDashboardRange(nowMs: number) {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useBookingRecommendations(nowMs: number) {
  const range = getBookingDashboardRange(nowMs);
  const metadataOptions = { staleTime: 60_000, refetchInterval: 5 * 60_000 };
  const userQuery = $accounts.useQuery("get", "/users/me", {}, metadataOptions);
  const roomsQuery = $roomBooking.useQuery(
    "get",
    "/rooms/",
    {
      params: { query: { include_red: true } },
    },
    metadataOptions,
  );
  const accessQuery = $roomBooking.useQuery(
    "get",
    "/rooms/my-access-list",
    {},
    metadataOptions,
  );
  const myBookingsQuery = $roomBooking.useQuery(
    "get",
    "/bookings/my",
    { params: { query: range } },
    { staleTime: 30_000, refetchInterval: 60_000 },
  );
  const availabilityEnabled =
    roomsQuery.isSuccess && roomsQuery.data.length > 0;
  const availabilityQuery = $roomBooking.useQuery(
    "get",
    "/bookings/",
    { params: { query: { ...range, include_red: true } } },
    {
      enabled: availabilityEnabled,
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  );
  const metadataQueries = [userQuery, roomsQuery, accessQuery, myBookingsQuery];
  const availabilityExpired =
    availabilityEnabled &&
    availabilityQuery.isSuccess &&
    nowMs - availabilityQuery.dataUpdatedAt > 90_000;
  const permissionsExpired = [userQuery, roomsQuery, accessQuery].some(
    (query) => query.isSuccess && nowMs - query.dataUpdatedAt > 6 * 60_000,
  );
  const isError =
    metadataQueries.some((query) => query.isError) ||
    (availabilityEnabled && availabilityQuery.isError) ||
    availabilityExpired ||
    permissionsExpired;
  // Never infer that rooms are free from failed, pending, or incomplete requests.
  // Keep successful personal bookings visible even when recommendations fail.
  const canRecommend =
    metadataQueries.every((query) => query.isSuccess) &&
    (!availabilityEnabled || availabilityQuery.isSuccess) &&
    !availabilityExpired &&
    !permissionsExpired;
  const entries = buildBookingRecommendations({
    rooms: roomsQuery.data ?? [],
    myBookings: myBookingsQuery.isSuccess ? myBookingsQuery.data : [],
    allBookings: availabilityQuery.data ?? [],
    myAccessList: accessQuery.data ?? [],
    role: userQuery.data?.innopolis_info ?? {},
    nowMs,
    rangeEndMs: canRecommend ? Date.parse(range.end) : NaN,
  });

  return {
    entries,
    isPending:
      metadataQueries.some((query) => query.isPending) ||
      (availabilityEnabled && availabilityQuery.isPending),
    isError,
    isFetching:
      metadataQueries.some((query) => query.isFetching) ||
      (availabilityEnabled && availabilityQuery.isFetching),
    refetch: () =>
      Promise.all([
        userQuery.refetch(),
        roomsQuery.refetch(),
        accessQuery.refetch(),
        myBookingsQuery.refetch(),
        ...(availabilityEnabled ? [availabilityQuery.refetch()] : []),
      ]),
  };
}
