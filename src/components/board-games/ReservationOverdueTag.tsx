import type { SchemaReservationOut } from "@/api/board-games/types.ts";
import { isReservationOverdue } from "./reservation-presentation";

export function ReservationOverdueTag({
  reservation,
}: {
  reservation: SchemaReservationOut;
}) {
  if (!isReservationOverdue(reservation)) return null;
  return (
    <span className="badge badge-error badge-soft shrink-0 gap-1">
      <span className="icon-[material-symbols--schedule-outline] text-sm" />
      Overdue
    </span>
  );
}
