import { TimetableWorkspace } from "@/components/schedule-assistant/timetable/TimetableWorkspace.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant/timetable")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TimetableWorkspace />
    </div>
  );
}
