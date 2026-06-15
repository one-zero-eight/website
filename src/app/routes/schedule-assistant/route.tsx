import { ScheduleConfigStatus } from "@/components/schedule-assistant/config/useConfig.tsx";
import { ChecksSessionProvider } from "@/components/schedule-assistant/checks/checksSession.tsx";
import { MainFloatingMenu } from "@/components/schedule-assistant/MainFloatingMenu.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-assistant")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      data-theme="light" // Always light theme
      className="font-rubik flex h-screen w-full flex-col text-base leading-normal antialiased [&_.tab]:select-text [&_button]:select-text [&_summary]:select-text"
    >
      <Helmet>
        <title>Составление расписания</title>
        <meta
          name="description"
          content="Составление расписания в Innopolis University."
        />
        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <ScheduleConfigStatus>
        <ChecksSessionProvider>
          <div className="bg-base-200/40 relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />

            <MainFloatingMenu />
          </div>
        </ChecksSessionProvider>
      </ScheduleConfigStatus>
    </div>
  );
}
