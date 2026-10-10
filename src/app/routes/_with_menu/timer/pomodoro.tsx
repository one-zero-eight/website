import { Topbar } from "@/components/layout/Topbar.tsx";
import { PomodoroPage } from "@/components/timer/PomodoroPage.tsx";
import { TimerPageTabs } from "@/components/timer/TimerPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/timer/pomodoro")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Pomodoro Timer</title>
        <meta
          name="description"
          content="Stay focused with work and break intervals."
        />
      </Helmet>

      <Topbar title="Pomodoro Timer" />
      <TimerPageTabs />
      <PomodoroPage />
    </>
  );
}
