import { PublicTimetablePage } from "@/components/schedule-assistant/timetable/PublicTimetablePage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, Link } from "@tanstack/react-router";

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
    <main className="@container/content flex h-dvh min-h-0 flex-col overflow-hidden">
      <Helmet>
        <title>Timetable</title>
        <meta
          name="description"
          content="Public class timetable of Innopolis University: groups, instructors and rooms."
        />
      </Helmet>
      <header className="flex shrink-0 items-center gap-3 px-4 py-3">
        <Link
          to="/dashboard"
          className="btn btn-sm btn-ghost"
          title="InNoHassle"
        >
          <span className="icon-[material-symbols--arrow-back-rounded] text-xl" />
        </Link>
        <h1 className="text-lg font-semibold">Расписание занятий</h1>
      </header>
      <PublicTimetablePage focusMeetingId={meeting} />
    </main>
  );
}
