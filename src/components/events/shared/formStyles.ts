import { cn } from "@/lib/ui/cn";

/** Matches room-booking BookingModal field focus (primary ring, no bright outline). */
export const eventFieldClassName =
  "bg-base-300 focus:ring-primary w-full rounded-xl px-4 py-2 text-base outline-hidden focus:ring-2";

export function eventFieldClass(...extra: (string | undefined | false)[]) {
  return cn(eventFieldClassName, ...extra);
}
