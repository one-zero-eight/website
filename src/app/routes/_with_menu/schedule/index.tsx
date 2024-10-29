import { Topbar } from "@/components/layout/Topbar.tsx";
import { ScheduleMainPage } from "@/components/schedule/ScheduleMainPage.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/schedule/")({
  component: () => (
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
      <ScheduleMainPage />
    </>
  ),
});
