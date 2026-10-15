import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";
import { PublicTimetablePage } from "@/components/schedule-assistant/timetable/PublicTimetablePage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/timetable")({
  validateSearch: (search: Record<string, unknown>): { meeting?: string } => ({
    meeting:
      typeof search.meeting === "string" && search.meeting.trim()
        ? search.meeting.trim()
        : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { meeting } = Route.useSearch();

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 grow overflow-hidden">
        <div className="@container/content flex min-h-0 grow flex-col overflow-hidden">
          <Helmet>
            <title>Timetable</title>
            <meta
              name="description"
              content="Public class timetable of Innopolis University: groups, instructors and rooms."
            />
          </Helmet>

          <PublicTimetablePage focusMeetingId={meeting} />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
