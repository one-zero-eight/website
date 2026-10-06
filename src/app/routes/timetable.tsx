import { PublicTimetablePage } from "@/components/schedule-assistant/timetable/PublicTimetablePage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";

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
      <div className="flex grow overflow-y-hidden">
        <div className="@container/content flex min-h-full grow flex-col overflow-y-auto">
          <Helmet>
            <title>Timetable</title>
            <meta
              name="description"
              content="Public class timetable of Innopolis University: groups, instructors and rooms."
            />
          </Helmet>

          <nav className="border-b-base-300 hidden w-full flex-row items-center border-b lg:flex">
            <div className="items-center py-2 pl-2">
              <Link
                to="/dashboard"
                className="btn btn-sm btn-ghost btn-circle"
                title="InNoHassle"
              >
                <span className="icon-[material-symbols--arrow-back-rounded] text-xl" />
              </Link>
            </div>
            <div className="grow py-2 pr-4 pl-2">
              <h1 className="mr-2 text-2xl font-medium sm:text-3xl">
                Расписание занятий
              </h1>
            </div>
          </nav>

          <div className="flex grow flex-col overflow-auto">
            <PublicTimetablePage focusMeetingId={meeting} />
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
