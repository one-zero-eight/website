import { Topbar } from "@/components/layout/Topbar.tsx";
import { TimerPageTabs } from "@/components/timer/TimerPageTabs.tsx";
import { HackatonTimerPage } from "@/components/timer/hackaton/HackatonTimerPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/timer/hackaton-timer")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Hackaton Timer</title>
        <meta
          name="description"
          content="Track milestones and time left until the next event of a hackathon or release."
        />
      </Helmet>

      <Topbar title="Hackaton Timer" />
      <TimerPageTabs />
      <HackatonTimerPage />
    </>
  );
}
