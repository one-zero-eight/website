import { isChecksReturnFrom } from "@/components/schedule-assistant/checks/ReturnToChecksLink.tsx";
import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { TimetableWorkspace } from "@/components/schedule-assistant/timetable/TimetableWorkspace.tsx";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

type SearchParams = {
  meeting?: string | undefined;
  from?: string | undefined;
};

export const Route = createFileRoute("/schedule-assistant/timetable")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    meeting:
      typeof search.meeting === "string" && search.meeting.trim()
        ? search.meeting.trim()
        : undefined,
    from: isChecksReturnFrom(
      typeof search.from === "string" ? search.from : undefined,
    )
      ? CHECKS_RETURN_FROM
      : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { meeting, from } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
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
