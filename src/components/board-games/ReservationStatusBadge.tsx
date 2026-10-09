import { ReservationStatus } from "@/api/board-games/types.ts";
import { cn } from "@/lib/ui/cn";
import { reservationStatusOptions } from "./reservation-presentation";

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  const option = reservationStatusOptions.find(
    (option) => option.value === status,
  );
  return (
    <span className={cn("badge badge-soft shrink-0 gap-1.5", option?.badge)}>
      <span className={cn("text-sm", option?.icon)} />
      {option?.label ?? status}
    </span>
  );
}
