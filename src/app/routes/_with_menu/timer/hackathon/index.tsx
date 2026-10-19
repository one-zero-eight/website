import { Topbar } from "@/components/layout/Topbar.tsx";
import { HackathonStartPage } from "@/components/timer/hackathon/HackathonStartPage.tsx";
import { TimerPageTabs } from "@/components/timer/TimerPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/timer/hackathon/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Hackathon Timer</title>
        <meta
          name="description"
          content="Track milestones and time left until the next event of a hackathon or release."
        />
      </Helmet>

      <Topbar title="Hackathon Timer" />
      <TimerPageTabs />
      <HackathonStartPage />
    </>
  );
}
