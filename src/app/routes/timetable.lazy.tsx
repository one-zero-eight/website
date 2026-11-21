import { BottomNavigation } from "@/components/layout/BottomNavigation.tsx";
import { PublicTimetablePage } from "@/components/schedule-assistant/timetable/PublicTimetablePage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useLingui } from "@lingui/react/macro";
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/timetable")({
  component: RouteComponent,
});

function RouteComponent() {
  const { meeting } = Route.useSearch();
  const { t } = useLingui();

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 grow overflow-hidden">
        <div className="@container/content flex min-h-0 grow flex-col overflow-hidden">
          <Helmet>
            <title>{t`Timetable`}</title>
            <meta
              name="description"
              content={t`Public class timetable of Innopolis University: groups, instructors and rooms.`}
            />
          </Helmet>

          <PublicTimetablePage focusMeetingId={meeting} />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
