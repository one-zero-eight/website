import { Topbar } from "@/components/layout/Topbar.tsx";
import SchedulePage from "@/components/schedule/SchedulePage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/_with_menu/schedule/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Schedule</title>
        <meta
          name="description"
          content={
            "Schedule of classes and events at Innopolis University. " +
            "Find your group and see the calendar with all classes."
          }
        />
      </Helmet>

      <Topbar title="Schedule" />
      <SchedulePage category={null} />
    </>
  );
}
