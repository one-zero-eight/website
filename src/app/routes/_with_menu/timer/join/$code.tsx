import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { JoinTimerPage } from "@/components/timer/hackathon/JoinTimerPage.tsx";
import { TimerPageTabs } from "@/components/timer/TimerPageTabs.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/timer/join/$code")({
  component: RouteComponent,
});

function RouteComponent() {
  const { code } = Route.useParams();

  return (
    <>
      <Helmet>
        <title>Join Timer</title>
        <meta
          name="description"
          content="Join a hackathon timer by invitation link."
        />
      </Helmet>

      <Topbar title="Hackathon Timer" />
      <TimerPageTabs />
      <RequireAuth>
        <JoinTimerPage invitation={code} />
      </RequireAuth>
    </>
  );
}
