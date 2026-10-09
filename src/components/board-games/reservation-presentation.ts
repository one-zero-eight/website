import {
  ReservationStatus,
  type SchemaReservationOut,
} from "@/api/board-games/types.ts";

export function isReservationOverdue(
  reservation: SchemaReservationOut,
  today = new Date(),
) {
  if (
    !reservation.return_date ||
    reservation.status === ReservationStatus.returned
  )
    return false;
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return reservation.return_date < todayDate;
}

export function prioritizeOverdueReservations<T extends SchemaReservationOut>(
  reservations: T[],
) {
  const today = new Date();
  return [...reservations].sort(
    (first, second) =>
      Number(isReservationOverdue(second, today)) -
      Number(isReservationOverdue(first, today)),
  );
}

export const reservationStatusOptions = [
  {
    value: ReservationStatus.reserved,
    label: "Reserved",
    description: "Waiting for pickup",
    icon: "icon-[material-symbols--schedule-outline]",
    badge: "badge-warning",
  },
  {
    value: ReservationStatus.taken,
    label: "Taken",
    description: "With the borrower",
    icon: "icon-[material-symbols--person-outline]",
    badge: "badge-info",
  },
  {
    value: ReservationStatus.returned,
    label: "Returned",
    description: "Back in storage",
    icon: "icon-[material-symbols--check-circle-outline]",
    badge: "badge-success",
  },
];

export function formatReservationDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
