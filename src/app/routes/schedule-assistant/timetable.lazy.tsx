import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { TimetableWorkspace } from "@/components/schedule-assistant/timetable/TimetableWorkspace.tsx";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/schedule-assistant/timetable")({
  component: RouteComponent,
});

function RouteComponent() {
  const { meeting, from } = Route.useSearch();
  const navigate = useNavigate({ from: "/schedule-assistant/timetable" });
  const returnFromChecks = from === CHECKS_RETURN_FROM;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TimetableWorkspace
        focusMeetingId={meeting}
        returnFromChecks={returnFromChecks}
        onFocusMeetingHandled={() =>
          navigate({
            search: returnFromChecks ? { from: CHECKS_RETURN_FROM } : {},
            replace: true,
          })
        }
      />
    </div>
  );
}
