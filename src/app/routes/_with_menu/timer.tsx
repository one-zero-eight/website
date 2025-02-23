import TimerPage from "@/components/timer/TimerPage.tsx";
import { Topbar } from "@/components/layout/Topbar.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/timer")({
  component: () => (
    <>
      <Helmet>
        <title>Timer</title>
        <meta
          name="description"
          content="Make a time deadline for any task with this timer."
        />
      </Helmet>

      <Topbar title="Timer" />
      <TimerPage />
    </>
  ),
});
