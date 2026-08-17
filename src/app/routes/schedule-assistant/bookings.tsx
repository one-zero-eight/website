import { BookingWorkspace } from "@/components/schedule-assistant/bookings/BookingWorkspace.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/bookings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-28">
      <BookingWorkspace />
    </div>
  );
}
